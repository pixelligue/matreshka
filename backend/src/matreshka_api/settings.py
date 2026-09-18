"""Environment-backed process settings. Missing URLs fail at startup."""

from __future__ import annotations

import sys
from typing import Any

from pydantic import Field, ValidationError, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_NAMES = {
    "database_url": "DATABASE_URL",
    "redis_url": "REDIS_URL",
    "llm_upstream_base_url": "LLM_UPSTREAM_BASE_URL",
    "llmtokenapi_api_key": "LLMTOKENAPI_API_KEY",
}


class Settings(BaseSettings):
    """Runtime configuration loaded from the environment."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str
    redis_url: str
    llm_upstream_base_url: str
    llmtokenapi_api_key: str
    session_ttl_seconds: int = Field(default=60 * 60 * 24 * 7, gt=0)
    update_artifact_root: str | None = None
    openrouter_api_key: str | None = None

    @field_validator(
        "database_url",
        "redis_url",
        "llm_upstream_base_url",
        "llmtokenapi_api_key",
    )
    @classmethod
    def urls_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be empty")
        return value

    @field_validator("update_artifact_root", "openrouter_api_key", mode="before")
    @classmethod
    def empty_optional_is_absent(cls, value: object) -> object:
        if value is None:
            return None
        if isinstance(value, str) and not value.strip():
            return None
        return value


def _exit_missing(names: list[str]) -> None:
    unique = list(dict.fromkeys(names))
    if len(unique) == 1:
        sys.stderr.write(f"Missing required environment variable: {unique[0]}\n")
    else:
        sys.stderr.write(
            "Missing required environment variables: " + ", ".join(unique) + "\n"
        )
    raise SystemExit(1)


def load_settings() -> Settings:
    """Load settings or exit non-zero naming the missing required variable."""
    try:
        return Settings()
    except ValidationError as exc:
        names: list[str] = []
        error: dict[str, Any]
        for error in exc.errors():
            loc = error.get("loc", ())
            if loc and loc[0] in _ENV_NAMES:
                names.append(_ENV_NAMES[str(loc[0])])
        if names:
            _exit_missing(names)
        raise


def async_database_url(url: str) -> str:
    """Return a SQLAlchemy async URL for the configured database."""
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url.removeprefix("postgresql://")
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url.removeprefix("postgres://")
    if url.startswith("sqlite://") and not url.startswith("sqlite+"):
        return "sqlite+aiosqlite://" + url.removeprefix("sqlite://")
    return url


def sync_database_url(url: str) -> str:
    """Return a SQLAlchemy sync URL for CLI and operator tools."""
    if url.startswith("sqlite+aiosqlite://"):
        return "sqlite://" + url.removeprefix("sqlite+aiosqlite://")
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url.removeprefix("postgresql://")
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url.removeprefix("postgres://")
    return url
