from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass, field
from pathlib import Path

import httpx
import pytest
from fakeredis import FakeAsyncRedis
from fastapi.testclient import TestClient

from matreshka_api.main import create_app
from matreshka_api.settings import Settings

TEST_UPSTREAM_BASE = "https://upstream.test"
TEST_UPSTREAM_KEY = "sk_test_upstream_key"

DEFAULT_SSE = (
    'data: {"id":"chatcmpl-mock","object":"chat.completion.chunk",'
    '"created":1,"model":"zai-org/GLM-5.3-Flash",'
    '"choices":[{"index":0,"delta":{"content":"Hello"}}]}\n\n'
    "data: [DONE]\n\n"
)


def sqlite_async_url(path: Path) -> str:
    return f"sqlite+aiosqlite:///{path.resolve().as_posix()}"


def make_settings(tmp_path: Path, **overrides: object) -> Settings:
    values: dict[str, object] = {
        "database_url": sqlite_async_url(tmp_path / "test.db"),
        "redis_url": "redis://127.0.0.1:6379/0",
        "session_ttl_seconds": 3600,
        "llm_upstream_base_url": TEST_UPSTREAM_BASE,
        "llm_upstream_api_key": TEST_UPSTREAM_KEY,
        "llmtokenapi_api_key": TEST_UPSTREAM_KEY,
        "openrouter_api_key": None,
    }
    values.update(overrides)
    return Settings(**values)  # type: ignore[arg-type]


@dataclass
class AppHarness:
    client: TestClient
    redis: FakeAsyncRedis
    settings: Settings
    upstream_calls: list[httpx.Request] = field(default_factory=list)


@pytest.fixture
def harness(tmp_path: Path) -> Iterator[AppHarness]:
    settings = make_settings(tmp_path)
    redis = FakeAsyncRedis(decode_responses=True)
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(
            200,
            headers={"content-type": "text/event-stream"},
            content=DEFAULT_SSE,
        )

    http_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    app = create_app(settings=settings, redis_client=redis, http_client=http_client)
    with TestClient(app) as client:
        yield AppHarness(
            client=client,
            redis=redis,
            settings=settings,
            upstream_calls=calls,
        )
