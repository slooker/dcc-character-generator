"""Database models. Import every model here so Alembic autogenerate sees it.

After changing a model: `alembic -c server/alembic.ini revision --autogenerate -m "..."`.

Times are naive UTC (`utcnow()`): SQLite has no timezone-aware column type,
so storing naive UTC everywhere keeps comparisons identical on every database.
"""
from datetime import UTC, datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from server.database import Base


def utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class User(Base):
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True)  # stored lowercased
    name: Mapped[str] = mapped_column(String(80), default='', server_default='')
    # Null until the address is confirmed with an emailed code; saving needs it set.
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    identities: Mapped[list['AuthIdentity']] = relationship(back_populates='user', cascade='all, delete-orphan')


class AuthIdentity(Base):
    """One way to sign in. `password` rows hold the hash; `google` rows (later) hold Google's subject id."""
    __tablename__ = 'auth_identities'
    __table_args__ = (UniqueConstraint('provider', 'provider_subject'),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    provider: Mapped[str] = mapped_column(String(20))
    provider_subject: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    user: Mapped[User] = relationship(back_populates='identities')


class UserSession(Base):
    """A signed-in browser. Only a SHA-256 of the cookie token is stored."""
    __tablename__ = 'sessions'

    id: Mapped[int] = mapped_column(primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)


class Character(Base):
    """A saved crawler: the builder's whole state as JSON, plus columns for the list view."""
    __tablename__ = 'characters'

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    name: Mapped[str] = mapped_column(String(120))
    level: Mapped[int] = mapped_column(Integer, default=1)
    schema_version: Mapped[int] = mapped_column(Integer, default=1)
    state: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class EmailCode(Base):
    """A 6-digit code emailed to `email`. purpose `verify` confirms the account's
    address; `change` confirms a new address before it replaces the old one.
    One live code per user and purpose; only a hash of the code is stored."""
    __tablename__ = 'email_codes'
    __table_args__ = (UniqueConstraint('user_id', 'purpose'),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    purpose: Mapped[str] = mapped_column(String(20))
    email: Mapped[str] = mapped_column(String(320))
    code_hash: Mapped[str] = mapped_column(String(64))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime)


class CustomBuild(Base):
    """A custom Race or Class made with the Build System (dist/builds.js), kept
    apart from any crawler. `data` is the build as the editor saves it; `public`
    builds are listed for everyone. `name_key` is the lowercased name, unique
    per author and kind, and among public builds of a kind."""
    __tablename__ = 'custom_builds'
    __table_args__ = (UniqueConstraint('user_id', 'kind', 'name_key'),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    kind: Mapped[str] = mapped_column(String(10))  # 'race' | 'class'
    name: Mapped[str] = mapped_column(String(80))
    name_key: Mapped[str] = mapped_column(String(80))
    public: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    data: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    user: Mapped[User] = relationship()
