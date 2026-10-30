"""Alembic environment: migrates the database at DATABASE_URL to match server.models."""
from logging.config import fileConfig

from alembic import context

import server.models  # noqa: F401  (registers every model on Base.metadata)
from server.database import Base, database_url, make_engine

config = context.config
if config.config_file_name is not None and config.attributes.get('configure_logger', True):
    fileConfig(config.config_file_name, disable_existing_loggers=False)

target_metadata = Base.metadata


def url() -> str:
    return config.get_main_option('sqlalchemy.url') or database_url()


def options(url_: str) -> dict:
    # SQLite can't ALTER most columns in place; batch mode rebuilds tables
    # instead. Other databases (Postgres, MySQL) use normal ALTERs.
    return {'target_metadata': target_metadata, 'render_as_batch': url_.startswith('sqlite')}


def run_migrations_offline() -> None:
    context.configure(url=url(), literal_binds=True, dialect_opts={'paramstyle': 'named'}, **options(url()))
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = make_engine(url())
    with engine.connect() as connection:
        context.configure(connection=connection, **options(url()))
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
