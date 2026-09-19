"""SQLModel tables."""

from __future__ import annotations

from datetime import datetime, timezone

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


class UsageEvent(SQLModel, table=True):
    """Metadata-only record of one attempted paid or potentially paid operation."""

    __tablename__ = "usage_events"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    occurred_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)
    operation: str = Field(index=True)
    provider: str
    model: str | None = None
    status: str
    input_tokens: int | None = None
    output_tokens: int | None = None
    amount_nanos: int | None = None
    currency: str | None = None
    amount_source: str | None = None
    request_bytes: int | None = None
    tool_schema_bytes: int | None = None
    tool_count: int | None = None
    result_bytes: int | None = None
    result_count: int | None = None
    provider_request_id: str | None = None
