"""Live OpenRouter consult/select. Skips without OPENROUTER_API_KEY."""

from __future__ import annotations

import os
from collections.abc import Iterator
from pathlib import Path

import httpx
import pytest
from fakeredis import FakeAsyncRedis
from fastapi.testclient import TestClient

from matreshka_api.auth import provision_user
from matreshka_api.main import create_app
from tests.conftest import make_settings

pytestmark = pytest.mark.live


def _env_openrouter_key() -> str | None:
    value = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if value:
        return value
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.is_file():
        return None
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if line.startswith("OPENROUTER_API_KEY="):
            key = line.split("=", 1)[1].strip().strip('"').strip("'")
            return key or None
    return None


LIVE_KEY = _env_openrouter_key()
skip_without_key = pytest.mark.skipif(not LIVE_KEY, reason="OPENROUTER_API_KEY is not set")


@pytest.fixture
def live_client(tmp_path: Path) -> Iterator[TestClient]:
    assert LIVE_KEY is not None
    settings = make_settings(tmp_path, openrouter_api_key=LIVE_KEY)
    redis = FakeAsyncRedis(decode_responses=True)
    http_client = httpx.AsyncClient(timeout=httpx.Timeout(connect=20, read=60, write=20, pool=10))
    app = create_app(settings=settings, redis_client=redis, http_client=http_client)
    with TestClient(app) as client:
        yield client


def _token(client: TestClient, tmp_path: Path) -> str:
    settings = make_settings(tmp_path, openrouter_api_key=LIVE_KEY)
    provision_user("op@example.com", "secret", settings=settings)
    response = client.post(
        "/v1/auth/login",
        json={"email": "op@example.com", "password": "secret"},
    )
    assert response.status_code == 200
    return response.json()["token"]


@skip_without_key
def test_live_small_consult_returns_verdict_and_cheap_usage(
    live_client: TestClient, tmp_path: Path
) -> None:
    token = _token(live_client, tmp_path)
    response = live_client.post(
        "/v1/consult",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "goal": "Add a type hint to a Python function",
            "question": "Is adding `-> None` to a function that returns nothing correct?",
            "plan": "Annotate def run() -> None",
            "evidence": "def run():\n    print('ok')",
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["verdict"] in {"ok", "revise", "risk"}
    assert isinstance(body["detail"], str)
    assert "sk-or-" not in response.text
    usage = body.get("usage")
    assert usage is not None
    assert usage["input_tokens"] > 0
    assert usage["usd"] < 0.01
    print(f"small consult tokens={usage['input_tokens']}+{usage['output_tokens']} usd={usage['usd']}")


@skip_without_key
def test_live_large_consult_stays_under_a_cent(
    live_client: TestClient, tmp_path: Path
) -> None:
    token = _token(live_client, tmp_path)
    evidence = "x = 1\n" * 1_500
    response = live_client.post(
        "/v1/consult",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "goal": "Review this generated module for an obvious crash",
            "question": "Does this snippet look safe to apply?",
            "plan": "Keep the assignment as-is",
            "evidence": evidence,
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["verdict"] in {"ok", "revise", "risk"}
    usage = body.get("usage")
    assert usage is not None
    assert usage["input_tokens"] > 500
    assert usage["usd"] < 0.02
    print(f"large consult tokens={usage['input_tokens']}+{usage['output_tokens']} usd={usage['usd']}")


@skip_without_key
def test_live_small_select_picks_a_candidate(
    live_client: TestClient, tmp_path: Path
) -> None:
    token = _token(live_client, tmp_path)
    response = live_client.post(
        "/v1/tools/select",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "goal": "Replace a function body in an existing file",
            "candidates": ["read_file", "apply_patch", "shell"],
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["tool"] in {"read_file", "apply_patch", "shell"}
    assert 0 <= body["confidence"] <= 1
    assert "sk-or-" not in response.text
    usage = body.get("usage")
    if usage is not None:
        assert usage["usd"] < 0.01
        print(f"small select tool={body['tool']} tokens={usage['input_tokens']}+{usage['output_tokens']} usd={usage['usd']}")
