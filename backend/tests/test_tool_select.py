from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass, field
from pathlib import Path

import httpx
import pytest
from fakeredis import FakeAsyncRedis
from fastapi.testclient import TestClient

from matreshka_api.auth import provision_user
from matreshka_api.main import create_app
from matreshka_api.openrouter import JEV_MODEL, OPENROUTER_DECISIONS_URL
from matreshka_api.settings import Settings
from tests.conftest import make_settings

OPENROUTER_KEY = "sk-or-test-select"


@dataclass
class SelectHarness:
    client: TestClient
    settings: Settings
    calls: list[httpx.Request] = field(default_factory=list)
    upstream_status: int = 200
    upstream_json: dict[str, object] = field(default_factory=dict)


def _harness(
    tmp_path: Path,
    *,
    openrouter_key: str | None = OPENROUTER_KEY,
) -> Iterator[SelectHarness]:
    overrides: dict[str, object] = {
        "openrouter_api_key": openrouter_key if openrouter_key is not None else "",
    }
    settings = make_settings(tmp_path, **overrides)
    redis = FakeAsyncRedis(decode_responses=True)
    state = SelectHarness(
        client=None,  # type: ignore[arg-type]
        settings=settings,
        upstream_json={
            "answers": {
                "tool": {"type": "choice", "choice": "apply_patch", "confidence": 0.81},
            },
            "usage": {"input_tokens": 80, "output_tokens": 5},
        },
    )

    def handler(request: httpx.Request) -> httpx.Response:
        state.calls.append(request)
        if str(request.url) == OPENROUTER_DECISIONS_URL:
            if state.upstream_status >= 400:
                return httpx.Response(
                    state.upstream_status,
                    json={"error": f"fail {OPENROUTER_KEY}"},
                )
            return httpx.Response(200, json=state.upstream_json)
        return httpx.Response(404, json={"detail": "unexpected"})

    http_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    app = create_app(settings=settings, redis_client=redis, http_client=http_client)
    with TestClient(app) as client:
        state.client = client
        yield state


@pytest.fixture
def select_harness(tmp_path: Path) -> Iterator[SelectHarness]:
    yield from _harness(tmp_path)


@pytest.fixture
def select_no_key(tmp_path: Path) -> Iterator[SelectHarness]:
    yield from _harness(tmp_path, openrouter_key=None)


def _token(harness: SelectHarness) -> str:
    provision_user("op@example.com", "secret", settings=harness.settings)
    response = harness.client.post(
        "/v1/auth/login",
        json={"email": "op@example.com", "password": "secret"},
    )
    assert response.status_code == 200
    return response.json()["token"]


def test_unauthenticated_select_is_401(select_harness: SelectHarness) -> None:
    response = select_harness.client.post(
        "/v1/tools/select",
        json={"goal": "edit", "candidates": ["read_file", "apply_patch"]},
    )
    assert response.status_code == 401
    assert select_harness.calls == []


def test_oversized_select_is_400(select_harness: SelectHarness) -> None:
    token = _token(select_harness)
    response = select_harness.client.post(
        "/v1/tools/select",
        headers={"Authorization": f"Bearer {token}"},
        json={"goal": "g" * 16_001, "candidates": ["read_file"]},
    )
    assert response.status_code == 400
    assert select_harness.calls == []


def test_empty_candidates_is_400(select_harness: SelectHarness) -> None:
    token = _token(select_harness)
    response = select_harness.client.post(
        "/v1/tools/select",
        headers={"Authorization": f"Bearer {token}"},
        json={"goal": "edit", "candidates": []},
    )
    assert response.status_code == 400
    assert select_harness.calls == []


def test_missing_openrouter_key_is_503(select_no_key: SelectHarness) -> None:
    token = _token(select_no_key)
    response = select_no_key.client.post(
        "/v1/tools/select",
        headers={"Authorization": f"Bearer {token}"},
        json={"goal": "edit", "candidates": ["read_file"]},
    )
    assert response.status_code == 503
    assert select_no_key.calls == []


def test_select_success_uses_jev(select_harness: SelectHarness) -> None:
    token = _token(select_harness)
    response = select_harness.client.post(
        "/v1/tools/select",
        headers={"Authorization": f"Bearer {token}"},
        json={"goal": "edit the file", "candidates": ["read_file", "apply_patch", "shell"]},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["tool"] == "apply_patch"
    assert body["confidence"] == 0.81
    assert body["usage"]["input_tokens"] == 80
    assert body["usage"]["usd"] < 0.0001
    assert OPENROUTER_KEY not in response.text
    request = select_harness.calls[0]
    assert str(request.url) == OPENROUTER_DECISIONS_URL
    payload = request.read().decode("utf-8")
    assert JEV_MODEL in payload
    assert "chat/completions" not in str(request.url)


def test_select_upstream_5xx_is_502_without_key(select_harness: SelectHarness) -> None:
    select_harness.upstream_status = 500
    token = _token(select_harness)
    response = select_harness.client.post(
        "/v1/tools/select",
        headers={"Authorization": f"Bearer {token}"},
        json={"goal": "edit", "candidates": ["read_file"]},
    )
    assert response.status_code == 502
    assert OPENROUTER_KEY not in response.text
