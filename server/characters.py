"""Saved crawlers, at most CHARACTER_LIMIT per account.

The server stores the builder's state as-is. Rules validation stays in
dist/rules.js; here we only check it's a reasonably sized JSON object and pull
out the fields the list view needs. Another user's crawler is a 404, the same
as one that doesn't exist.
"""
import json

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from server.auth import verified_user
from server.database import get_session
from server.models import Character, User

CHARACTER_LIMIT = 5
MAX_STATE_BYTES = 256 * 1024

router = APIRouter(prefix='/api/characters', tags=['characters'])


class CharacterBody(BaseModel):
    state: dict


def checked_state(state: dict) -> dict:
    if len(json.dumps(state, separators=(',', ':'))) > MAX_STATE_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, 'That crawler is too large to save.')
    return state


def apply_state(character: Character, state: dict) -> None:
    name = state.get('name')
    level_ups = state.get('levelUps')
    version = state.get('version')
    character.state = state
    character.name = (name.strip() if isinstance(name, str) else '')[:120] or 'Unnamed Crawler'
    character.level = 1 + (len(level_ups) if isinstance(level_ups, list) else 0)
    character.schema_version = version if isinstance(version, int) else 1


def summary(character: Character) -> dict:
    state = character.state or {}
    text = lambda key: state.get(key) if isinstance(state.get(key), str) else ''
    return {
        'id': character.id,
        'name': character.name,
        'level': character.level,
        'number': state.get('number'),
        'floor': state.get('floor'),
        'race': text('race'),
        'className': text('className'),
        'updatedAt': character.updated_at.isoformat() + 'Z',
    }


def owned(db: Session, user: User, character_id: int) -> Character:
    character = db.scalar(select(Character).where(Character.id == character_id, Character.user_id == user.id))
    if character is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, 'Crawler not found.')
    return character


@router.get('')
def list_characters(user: User = Depends(verified_user), db: Session = Depends(get_session)):
    rows = db.scalars(select(Character).where(Character.user_id == user.id).order_by(Character.updated_at.desc()))
    return {'characters': [summary(x) for x in rows], 'limit': CHARACTER_LIMIT}


@router.post('', status_code=status.HTTP_201_CREATED)
def create_character(body: CharacterBody, user: User = Depends(verified_user), db: Session = Depends(get_session)):
    state = checked_state(body.state)
    # Lock the user's row so two saves at once can't both see 4 crawlers
    # (Postgres/MySQL; SQLite already allows only one writer at a time).
    db.execute(select(User.id).where(User.id == user.id).with_for_update())
    count = db.scalar(select(func.count()).select_from(Character).where(Character.user_id == user.id))
    if count >= CHARACTER_LIMIT:
        raise HTTPException(status.HTTP_409_CONFLICT, f'You already have {CHARACTER_LIMIT} saved crawlers. Delete one to save another.')
    character = Character(user_id=user.id)
    apply_state(character, state)
    db.add(character)
    db.commit()
    return {**summary(character), 'state': character.state}


@router.get('/{character_id}')
def get_character(character_id: int, user: User = Depends(verified_user), db: Session = Depends(get_session)):
    character = owned(db, user, character_id)
    return {**summary(character), 'state': character.state}


@router.put('/{character_id}')
def update_character(character_id: int, body: CharacterBody, user: User = Depends(verified_user), db: Session = Depends(get_session)):
    character = owned(db, user, character_id)
    apply_state(character, checked_state(body.state))
    db.commit()
    return {**summary(character), 'state': character.state}


@router.delete('/{character_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_character(character_id: int, user: User = Depends(verified_user), db: Session = Depends(get_session)):
    db.delete(owned(db, user, character_id))
    db.commit()
