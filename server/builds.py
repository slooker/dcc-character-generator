"""Custom Races and Classes, kept apart from any crawler (at most BUILD_LIMIT
per account).

The Build System rules live in dist/builds.js, which validates a build before
a crawler can take it, the same way characters.py leaves rules to rules.js.
Here we check the shape and size, that the name is allowed (see
moderation.py; book Race/Class names are taken), and that the build's text is
appropriate, because a build can be shared.

- Private builds are only visible to their author.
- Public builds are listed for everyone, signed in or not, with the author's
  profile name. Two public builds of a kind can't share a name, so a shared
  build can't pass itself off as someone else's.
"""
import json
import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from server import moderation
from server.auth import current_session, verified_user
from server.database import get_session
from server.models import CustomBuild, User, UserSession

BUILD_LIMIT = 20
MAX_BUILD_BYTES = 64 * 1024
PUBLIC_PAGE = 60
DIST = Path(os.environ.get('DIST_DIR', Path(__file__).resolve().parent.parent / 'dist')).resolve()

router = APIRouter(prefix='/api/builds', tags=['builds'])


class BuildBody(BaseModel):
    kind: Literal['race', 'class']
    name: str
    public: bool = False
    data: dict


@lru_cache
def book_entries(key: str) -> frozenset[str]:
    """Lowercased names in a list from dist/races-classes.js (races or classes)."""
    try:
        source = (DIST / 'races-classes.js').read_text(encoding='utf-8')
    except OSError:
        return frozenset()
    match = re.search(rf'^export const {key} = (.*);$', source, re.M)
    return frozenset(entry['name'].lower() for entry in json.loads(match.group(1))) if match else frozenset()


def book_names() -> frozenset[str]:
    return book_entries('races') | book_entries('classes')


def strings(value):
    """Every string inside a JSON value."""
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for item in value.values():
            yield from strings(item)
    elif isinstance(value, list):
        for item in value:
            yield from strings(item)


def checked(body: BuildBody) -> tuple[str, dict]:
    name = ' '.join(body.name.split())
    issue = moderation.name_issue(name)
    if issue:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, issue)
    if name.lower() in book_names():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f'{name} is already a Race or Class in the book. Choose a different name.')
    data = {**body.data, 'kind': body.kind, 'name': name}
    if len(json.dumps(data, separators=(',', ':'))) > MAX_BUILD_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, 'That build is too large to save.')
    if any(moderation.inappropriate(text) for text in strings(body.data)):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            'Part of the description or a benefit isn’t allowed. Keep it free of slurs, sexual terms and strong profanity.')
    return name, data


def author_name(user: User) -> str:
    # Profile names are screened when set, but older ones weren't.
    return user.name if user.name and not moderation.inappropriate(user.name) else 'An anonymous crawler'


def build_json(build: CustomBuild, viewer_id: int | None = None) -> dict:
    return {
        'id': build.id,
        'kind': build.kind,
        'name': build.name,
        'public': build.public,
        'author': author_name(build.user),
        'mine': build.user_id == viewer_id,
        'data': build.data,
        'updatedAt': build.updated_at.isoformat() + 'Z',
    }


def check_names(db: Session, user: User, kind: str, name: str, public: bool, build_id: int | None = None) -> None:
    key = name.lower()
    others = select(CustomBuild.id).where(CustomBuild.kind == kind, CustomBuild.name_key == key)
    if build_id is not None:
        others = others.where(CustomBuild.id != build_id)
    label = 'Class' if kind == 'class' else 'Race'
    if db.scalar(others.where(CustomBuild.user_id == user.id)):
        raise HTTPException(status.HTTP_409_CONFLICT, f'You already have a custom {label} named {name}.')
    if public and db.scalar(others.where(CustomBuild.public.is_(True))):
        raise HTTPException(status.HTTP_409_CONFLICT, f'Someone already shared a custom {label} named {name}. Choose a different name to share it.')


def owned(db: Session, user: User, build_id: int) -> CustomBuild:
    build = db.scalar(select(CustomBuild).where(CustomBuild.id == build_id, CustomBuild.user_id == user.id))
    if build is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, 'Build not found.')
    return build


@router.get('')
def list_builds(user: User = Depends(verified_user), db: Session = Depends(get_session)):
    rows = db.scalars(select(CustomBuild).where(CustomBuild.user_id == user.id).order_by(CustomBuild.updated_at.desc()))
    return {'builds': [build_json(x, user.id) for x in rows], 'limit': BUILD_LIMIT}


@router.get('/public')
def public_builds(kind: Literal['race', 'class'] | None = None, q: str = '', offset: int = 0,
                  session: UserSession | None = Depends(current_session), db: Session = Depends(get_session)):
    query = select(CustomBuild).where(CustomBuild.public.is_(True))
    if kind:
        query = query.where(CustomBuild.kind == kind)
    words = q.lower().split()[:5]
    for word in words:
        query = query.where(CustomBuild.name_key.contains(word[:40], autoescape=True))
    rows = db.scalars(query.order_by(CustomBuild.updated_at.desc()).offset(max(0, offset)).limit(PUBLIC_PAGE + 1)).all()
    viewer = session.user_id if session else None
    return {'builds': [build_json(x, viewer) for x in rows[:PUBLIC_PAGE]], 'more': len(rows) > PUBLIC_PAGE}


@router.get('/{build_id}')
def get_build(build_id: int, session: UserSession | None = Depends(current_session), db: Session = Depends(get_session)):
    viewer = session.user_id if session else None
    build = db.scalar(select(CustomBuild).where(CustomBuild.id == build_id, or_(CustomBuild.public.is_(True), CustomBuild.user_id == viewer)))
    if build is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, 'Build not found.')
    return build_json(build, viewer)


@router.post('', status_code=status.HTTP_201_CREATED)
def create_build(body: BuildBody, user: User = Depends(verified_user), db: Session = Depends(get_session)):
    name, data = checked(body)
    # Lock the user's row so two saves at once can't both pass the limit.
    db.execute(select(User.id).where(User.id == user.id).with_for_update())
    count = db.scalar(select(func.count()).select_from(CustomBuild).where(CustomBuild.user_id == user.id))
    if count >= BUILD_LIMIT:
        raise HTTPException(status.HTTP_409_CONFLICT, f'You already have {BUILD_LIMIT} custom Races and Classes. Delete one to make another.')
    check_names(db, user, body.kind, name, body.public)
    build = CustomBuild(user_id=user.id, kind=body.kind, name=name, name_key=name.lower(), public=body.public, data=data)
    db.add(build)
    db.commit()
    return build_json(build, user.id)


@router.put('/{build_id}')
def update_build(build_id: int, body: BuildBody, user: User = Depends(verified_user), db: Session = Depends(get_session)):
    build = owned(db, user, build_id)
    if body.kind != build.kind:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, 'A custom Race can’t become a Class, or the other way around.')
    name, data = checked(body)
    check_names(db, user, body.kind, name, body.public, build.id)
    build.name, build.name_key, build.public, build.data = name, name.lower(), body.public, data
    db.commit()
    return build_json(build, user.id)


@router.delete('/{build_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_build(build_id: int, user: User = Depends(verified_user), db: Session = Depends(get_session)):
    db.delete(owned(db, user, build_id))
    db.commit()
