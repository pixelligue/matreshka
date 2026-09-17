from __future__ import annotations

from pathlib import Path

import pytest
from fakeredis import FakeAsyncRedis
from fastapi.testclient import TestClient

from matreshka_api.main import create_app
from tests.conftest import AppHarness, make_settings


class FailingRedis:
    async def ping(self) -> bool:
        raise ConnectionError("redis down")

    async def aclose(self) -> None:
        return None


class _FailingConnect:
    async def __aenter__(self) -> None:
        raise OSError("postgres down")

    async def __aexit__(self, *args: object) -> None:
        return None


class FailingEngine:
    def connect(self) -> _FailingConnect:
        return _FailingConnect()

    async def dispose(self) -> None:
        return None


def test_health_ok_when_postgres_and_redis_up(harness: AppHarness) -> None:
    response = harness.client.get("/health")
    assert response.status_code == 200


def test_health_503_when_redis_down(tmp_path: Path) -> None:
    settings = make_settings(tmp_path)
    app = create_app(settings=settings, redis_client=FailingRedis())  # type: ignore[arg-type]
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code == 503


def test_health_503_when_postgres_down(tmp_path: Path) -> None:
    settings = make_settings(tmp_path)
    app = create_app(settings=settings, redis_client=FakeAsyncRedis(decode_responses=True))
    with TestClient(app) as client:
        original = app.state.engine
        app.state.engine = FailingEngine()
        try:
            response = client.get("/health")
        finally:
            app.state.engine = original
    assert response.status_code == 503


class _FailingTxn:
    async def __aenter__(self) -> None:
        raise OSError("postgres down")

    async def __aexit__(self, *args: object) -> None:
        return None


class UnreachableEngine:
    def begin(self) -> _FailingTxn:
        return _FailingTxn()

    def connect(self) -> _FailingConnect:
        return _FailingConnect()

    async def dispose(self) -> None:
        return None


def test_health_serves_503_when_schema_bootstrap_fails(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "matreshka_api.main.create_db_engine",
        lambda _url: UnreachableEngine(),
    )
    settings = make_settings(tmp_path)
    app = create_app(settings=settings, redis_client=FakeAsyncRedis(decode_responses=True))
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code == 503
