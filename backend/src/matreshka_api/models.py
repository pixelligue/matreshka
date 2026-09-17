"""SQLModel tables."""

from __future__ import annotations

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    """Operator account stored in Postgres (or the test database)."""

    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
