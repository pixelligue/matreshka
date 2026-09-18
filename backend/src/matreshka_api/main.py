"""FastAPI application entrypoint."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from redis.asyncio import Redis

from matreshka_api.auth import router as auth_router
from matreshka_api.chat import router as chat_router
from matreshka_api.updates import router as updates_router
from matreshka_api.consult import router as consult_router
from matreshka_api.tool_select import router as tool_select_router
from matreshka_api.web_search import router as web_search_router
from matreshka_api.db import (
    EngineDep,
    RedisDep,
    create_db_engine,
    create_tables,
    ping_postgres,
    ping_redis,
)
from matreshka_api.loop import install_windows_selector_event_loop
from matreshka_api.settings import Settings, async_database_url, load_settings

install_windows_selector_event_loop()

# Streaming chat waits on LLMTOKENAPI between content and tool_call deltas.
UPSTREAM_HTTP_TIMEOUT = httpx.Timeout(connect=30.0, read=300.0, write=60.0, pool=30.0)


class HealthResponse(BaseModel):
    status: str


async def _aclose_redis(redis: object) -> None:
    close = getattr(redis, "aclose", None)
    if close is not None:
        await close()


def create_app(
    *,
    settings: Settings | None = None,
    redis_client: Redis | None = None,
    http_client: httpx.AsyncClient | None = None,
) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        resolved = settings if settings is not None else load_settings()
        app.state.settings = resolved
        engine = create_db_engine(async_database_url(resolved.database_url))
        app.state.engine = engine
        redis = (
            redis_client
            if redis_client is not None
            else Redis.from_url(resolved.redis_url, decode_responses=True)
        )
        app.state.redis = redis
        client = (
            http_client
            if http_client is not None
            else httpx.AsyncClient(timeout=UPSTREAM_HTTP_TIMEOUT)
        )
        app.state.http_client = client
        try:
            try:
                await create_tables(engine)
            except Exception as _schema_error:
                # Keep serving /health as 503 until Postgres is reachable.
                _ = _schema_error
            yield
        finally:
            await engine.dispose()
            await _aclose_redis(redis)
            await client.aclose()

    application = FastAPI(title="Matreshka API", lifespan=lifespan)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=['*'],
        allow_methods=['*'],
        allow_headers=['*'],
    )
    application.include_router(auth_router)
    application.include_router(chat_router)
    application.include_router(updates_router)
    application.include_router(web_search_router)
    application.include_router(consult_router)
    application.include_router(tool_select_router)
    application.add_api_route(
        "/health",
        health,
        methods=["GET"],
        response_model=HealthResponse,
        tags=["health"],
    )
    return application


async def health(engine: EngineDep, redis: RedisDep) -> HealthResponse:
    postgres_ok = await ping_postgres(engine)
    redis_ok = await ping_redis(redis)
    if postgres_ok and redis_ok:
        return HealthResponse(status="ok")
    raise HTTPException(status_code=503, detail="unhealthy")


app = create_app()
