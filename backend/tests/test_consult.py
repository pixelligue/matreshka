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
from matreshka_api.openrouter import FLASH_MODEL, OPENROUTER_CHAT_URL
from matreshka_api.settings import Settings
from tests.conftest import make_settings

OPENROUTER_KEY = "sk-or-test-consult"


@dataclass
class ConsultHarness:
    client: TestClient
    settings: Settings
    calls: list[httpx.Request] = field(default_factory=list)
    upstream_status: int = 200
    upstream_json: dict[str, object] = field(default_factory=dict)


def _harness(
    tmp_path: Path,
    *,
    openrouter_key: str | None = OPENROUTER_KEY,
) -> Iterator[ConsultHarness]:
    overrides: dict[str, object] = {
        "openrouter_api_key": openrouter_key if openrouter_key is not None else "",
    }
    settings = make_settings(tmp_path, **overrides)
    redis = FakeAsyncRedis(decode_responses=True)
    state = ConsultHarness(
        client=None,  # type: ignore[arg-type]
        settings=settings,
        upstream_json={
            "choices": [{
                "message": {"content": '{"verdict":"ok","detail":"safe to proceed"}'},
            }],
            "usage": {"prompt_tokens": 120, "completion_tokens": 20},
        },
    )

    def handler(request: httpx.Request) -> httpx.Response:
        state.calls.append(request)
        if str(request.url) == OPENROUTER_CHAT_URL:
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
def consult_harness(tmp_path: Path) -> Iterator[ConsultHarness]:
    yield from _harness(tmp_path)


@pytest.fixture
def consult_no_key(tmp_path: Path) -> Iterator[ConsultHarness]:
    yield from _harness(tmp_path, openrouter_key=None)


def _token(harness: ConsultHarness) -> str:
    provision_user("op@example.com", "secret", settings=harness.settings)
    response = harness.client.post(
        "/v1/auth/login",
        json={"email": "op@example.com", "password": "secret"},
    )
    assert response.status_code == 200
    return response.json()["token"]


def test_unauthenticated_consult_is_401(consult_harness: ConsultHarness) -> None:
    response = consult_harness.client.post(
        "/v1/consult",
        json={"goal": "g", "question": "q"},
    )
    assert response.status_code == 401
    assert consult_harness.calls == []


def test_missing_openrouter_key_is_503(consult_no_key: ConsultHarness) -> None:
    token = _token(consult_no_key)
    response = consult_no_key.client.post(
        "/v1/consult",
        headers={"Authorization": f"Bearer {token}"},
        json={"goal": "g", "question": "q"},
    )
    assert response.status_code == 503
    assert consult_no_key.calls == []


def test_oversized_consult_is_400(consult_harness: ConsultHarness) -> None:
    token = _token(consult_harness)
    response = consult_harness.client.post(
        "/v1/consult",
        headers={"Authorization": f"Bearer {token}"},
        json={"goal": "g", "question": "q", "evidence": "x" * 32_001},
    )
    assert response.status_code == 400
    assert consult_harness.calls == []


def test_consult_success_uses_flash_and_hides_key(consult_harness: ConsultHarness) -> None:
    token = _token(consult_harness)
    response = consult_harness.client.post(
        "/v1/consult",
        headers={"Authorization": f"Bearer {token}"},
        json={"goal": "ship the patch", "question": "is the diff safe?", "plan": "edit", "evidence": "tests pass"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["verdict"] == "ok"
    assert body["detail"] == "safe to proceed"
    assert body["usage"]["input_tokens"] == 120
    assert body["usage"]["output_tokens"] == 20
    assert body["usage"]["usd"] < 0.001
    assert OPENROUTER_KEY not in response.text
    assert len(consult_harness.calls) == 1
    request = consult_harness.calls[0]
    assert str(request.url) == OPENROUTER_CHAT_URL
    assert request.headers["authorization"] == f"Bearer {OPENROUTER_KEY}"
    payload = request.read().decode("utf-8")
    assert FLASH_MODEL in payload
    assert "llmtokenapi" not in payload.lower()


def test_consult_upstream_5xx_is_502_without_key(consult_harness: ConsultHarness) -> None:
    consult_harness.upstream_status = 500
    token = _token(consult_harness)
    response = consult_harness.client.post(
        "/v1/consult",
        headers={"Authorization": f"Bearer {token}"},
        json={"goal": "g", "question": "q"},
    )
    assert response.status_code == 502
    assert OPENROUTER_KEY not in response.text
