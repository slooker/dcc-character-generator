"""SQLAlchemy setup for the crawler builder's SQLite database.

DATABASE_URL defaults to the SQLite file in the Docker volume
(docker-compose.yaml). Any SQLAlchemy URL works, e.g.
postgresql+psycopg://user:pass@host/db or mysql+pymysql://user:pass@host/db,
once that database's driver is added to server/requirements.txt. Tables are
declared as models on `Base`; Alembic (server/alembic/) migrates the database
to match them.
"""
import os
from functools import lru_cache
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session

DEFAULT_URL = 'sqlite:////data/app.db'
ALEMBIC_INI = Path(__file__).resolve().parent / 'alembic.ini'


class Base(DeclarativeBase):
    pass


def database_url() -> str:
    return os.environ.get('DATABASE_URL', DEFAULT_URL)


def make_engine(url: str | None = None):
    """Engine for any SQLAlchemy URL; SQLite-only setup applies just to SQLite."""
    url = url or database_url()
    if not url.startswith('sqlite'):
        return create_engine(url, pool_pre_ping=True)
    if url.startswith('sqlite:///'):
        Path(url.removeprefix('sqlite:///')).parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(url)

    @event.listens_for(engine, 'connect')
    def _sqlite_pragmas(dbapi_connection, _record):
        cursor = dbapi_connection.cursor()
        cursor.execute('PRAGMA foreign_keys = ON')  # SQLite ignores foreign keys unless asked
        cursor.execute('PRAGMA journal_mode = WAL')
        cursor.close()

    return engine


def alembic_config(url: str | None = None) -> Config:
    config = Config(str(ALEMBIC_INI))
    config.set_main_option('script_location', str(ALEMBIC_INI.parent / 'alembic'))
    config.set_main_option('sqlalchemy.url', url or database_url())
    return config


def upgrade(url: str | None = None) -> None:
    """Migrate the database to the newest revision."""
    command.upgrade(alembic_config(url), 'head')


@lru_cache
def get_engine():
    return make_engine()


def get_session():
    """FastAPI dependency: one Session per request."""
    with Session(get_engine()) as session:
        yield session
