"""Deepgram Nova-3 transcription proxy: auth, size, and a redacted upstream failure."""

from __future__ import annotations

import base64
from collections.abc import Iterator
from dataclasses import dataclass, field
from pathlib import Path

import httpx
import pytest
from fakeredis import FakeAsyncRedis
from fastapi.testclient import TestClient

from matreshka_api.auth import provision_user
from matreshka_api.main import create_app
from matreshka_api.settings import Settings
from matreshka_api.transcription import OPENROUTER_TRANSCRIPTIONS_URL, TRANSCRIBE_MODEL
from tests.conftest import make_settings

OPENROUTER_KEY = "sk-or-test-transcribe"
AUDIO = base64.b64encode(b"fake-mp3").decode("ascii")


@dataclass
class TranscribeHarness:
    client: TestClient
    settings: Settings
    calls: list[httpx.Request] = field(default_factory=list)
    status: int = 200


def _harness(tmp_path: Path, *, openrouter_key: str | None = OPENROUTER_KEY) -> Iterator[TranscribeHarness]:
    settings = make_settings(
        tmp_path,
        **{"openrouter_api_key": openrouter_key if openrouter_key is not None else ""},
    )
    redis = FakeAsyncRedis(decode_responses=True)
    state = TranscribeHarness(client=None, settings=settings)  # type: ignore[arg-type]

    def handler(request: httpx.Request) -> httpx.Response:
        state.calls.append(request)
        if str(request.url) != OPENROUTER_TRANSCRIPTIONS_URL:
            return httpx.Response(404, json={"detail": "unexpected"})
        if state.status >= 400:
            return httpx.Response(state.status, json={"error": f"fail {OPENROUTER_KEY}"})
        return httpx.Response(200, json={
            "text": "привет",
            "usage": {"seconds": 2.5, "cost": 0.00018},
        })

    http_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    app = create_app(settings=settings, redis_client=redis, http_client=http_client)
    with TestClient(app) as client:
        state.client = client
        yield state


@pytest.fixture
def transcribe_harness(tmp_path: Path) -> Iterator[TranscribeHarness]:
    yield from _harness(tmp_path)


def _token(harness: TranscribeHarness) -> str:
    provision_user("op@example.com", "secret", settings=harness.settings)
    login = harness.client.post("/v1/auth/login", json={"email": "op@example.com", "password": "secret"})
    assert login.status_code == 200
    return login.json()["token"]


def test_transcribe_requires_auth(transcribe_harness: TranscribeHarness) -> None:
    response = transcribe_harness.client.post(
        "/v1/audio/transcriptions",
        json={"data": AUDIO, "format": "mp3"},
    )
    assert response.status_code == 401


def test_transcribe_requires_openrouter(tmp_path: Path) -> None:
    generated = _harness(tmp_path, openrouter_key=None)
    harness = next(generated)
    try:
        token = _token(harness)
        response = harness.client.post(
            "/v1/audio/transcriptions",
            headers={"authorization": f"Bearer {token}"},
            json={"data": AUDIO, "format": "mp3"},
        )
        assert response.status_code == 503
        assert harness.calls == []
    finally:
        generated.close()


def test_transcribe_posts_nova3_and_returns_text(transcribe_harness: TranscribeHarness) -> None:
    token = _token(transcribe_harness)
    response = transcribe_harness.client.post(
        "/v1/audio/transcriptions",
        headers={"authorization": f"Bearer {token}"},
        json={"data": AUDIO, "format": "mp3", "language": "ru"},
    )
    assert response.status_code == 200
    assert response.json() == {"text": "привет", "model": TRANSCRIBE_MODEL, "seconds": 2.5}
    body = transcribe_harness.calls[0].read().decode("utf-8")
    assert TRANSCRIBE_MODEL in body
    assert '"format": "mp3"' in body or '"format":"mp3"' in body
    assert "ru" in body
    assert OPENROUTER_KEY not in response.text


def test_transcribe_rejects_empty_and_huge_audio(transcribe_harness: TranscribeHarness) -> None:
    token = _token(transcribe_harness)
    empty = transcribe_harness.client.post(
        "/v1/audio/transcriptions",
        headers={"authorization": f"Bearer {token}"},
        json={"data": "", "format": "wav"},
    )
    assert empty.status_code == 400
    huge = base64.b64encode(b"x" * (25 * 1024 * 1024 + 1)).decode("ascii")
    oversized = transcribe_harness.client.post(
        "/v1/audio/transcriptions",
        headers={"authorization": f"Bearer {token}"},
        json={"data": huge, "format": "wav"},
    )
    assert oversized.status_code == 400
    assert transcribe_harness.calls == []


def test_transcribe_hides_the_upstream_key(transcribe_harness: TranscribeHarness) -> None:
    transcribe_harness.status = 500
    token = _token(transcribe_harness)
    response = transcribe_harness.client.post(
        "/v1/audio/transcriptions",
        headers={"authorization": f"Bearer {token}"},
        json={"data": AUDIO, "format": "ogg"},
    )
    assert response.status_code == 502
    assert OPENROUTER_KEY not in response.text
