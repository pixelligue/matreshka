"""SQLModel tables."""

from __future__ import annotations

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    """Operator account stored in Postgres (or the test database)."""

    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str


class PluginConnection(SQLModel, table=True):
    """Per-user CIS plugin credential and enablement."""

    __tablename__ = "plugin_connections"
    __table_args__ = (UniqueConstraint("user_id", "plugin_id"),)

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    plugin_id: str = Field(index=True)
    enabled: bool = False
    secret: str = ""
