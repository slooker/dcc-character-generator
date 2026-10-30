"""Database models. Import every model here so Alembic autogenerate sees it.

Accounts and saved characters will be added here, followed by
`alembic -c server/alembic.ini revision --autogenerate -m "..."`.
"""
from server.database import Base  # noqa: F401
