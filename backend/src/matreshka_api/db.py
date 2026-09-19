"""Database engine, schema bootstrap, and request-scoped dependencies."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from typing import Annotated, Any

from fastapi import Depends, Request
from redis.asyncio import Redis
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from matreshka_api.models import PluginConnection, UsageEvent, User  # noqa: F401  # register metadata
from matreshka_api.settings import Settings

HEALTH_PING_TIMEOUT_SECONDS = 2.0


def create_db_engine(database_url: str) -> AsyncEngine:
    kwargs: dict[str, Any] = {}
    if database_url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
        kwargs["poolclass"] = StaticPool
    return create_async_engine(database_url, **kwargs)


def create_sync_engine(database_url: str) -> Engine:
    kwargs: dict[str, Any] = {}
    if database_url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
    return create_engine(database_url, **kwargs)


async def create_tables(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


async def ping_postgres(engine: AsyncEngine) -> bool:
    try:
        async with asyncio.timeout(HEALTH_PING_TIMEOUT_SECONDS):
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
    except Exception as _db_unreachable:
        return False
    return True


async def ping_redis(redis: Redis) -> bool:
    try:
        async with asyncio.timeout(HEALTH_PING_TIMEOUT_SECONDS):
            await redis.ping()
    except Exception as _redis_unreachable:
        return False
    return True


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_redis(request: Request) -> Redis:
    return request.app.state.redis


def get_engine(request: Request) -> AsyncEngine:
    return request.app.state.engine


async def get_db_session(request: Request) -> AsyncIterator[AsyncSession]:
    async with AsyncSession(request.app.state.engine, expire_on_commit=False) as session:
        yield session


SettingsDep = Annotated[Settings, Depends(get_settings)]
RedisDep = Annotated[Redis, Depends(get_redis)]
EngineDep = Annotated[AsyncEngine, Depends(get_engine)]
SessionDep = Annotated[AsyncSession, Depends(get_db_session)]
