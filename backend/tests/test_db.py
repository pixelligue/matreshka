from __future__ import annotations

from pathlib import Path

from fakeredis import FakeAsyncRedis
from fastapi.testclient import TestClient

from matreshka_api.main import create_app
from tests.conftest import make_settings


def test_create_all_second_start_succeeds(tmp_path: Path) -> None:
    settings = make_settings(tmp_path)
    app1 = create_app(
        settings=settings,
        redis_client=FakeAsyncRedis(decode_responses=True),
    )
    with TestClient(app1) as client:
        assert client.get("/health").status_code == 200

    app2 = create_app(
        settings=settings,
        redis_client=FakeAsyncRedis(decode_responses=True),
    )
    with TestClient(app2) as client:
        assert client.get("/health").status_code == 200
