from __future__ import annotations

import json
from collections.abc import Iterator
from dataclasses import dataclass, field
from pathlib import Path

import httpx
import pytest
from fakeredis import FakeAsyncRedis
from fastapi.testclient import TestClient

from matreshka_api.auth import provision_user
from matreshka_api.images import OPENROUTER_IMAGES_URL
from matreshka_api.main import create_app
from matreshka_api.openrouter import OPENROUTER_DECISIONS_URL
from matreshka_api.settings import Settings
from tests.conftest import make_settings

OPENROUTER_KEY = "sk-or-test-images"
TINY_PNG = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


@dataclass
class ImageHarness:
    client: TestClient
    settings: Settings
    calls: list[httpx.Request] = field(default_factory=list)
    jev_choice: str = "qwen-image-3"
    image_status: int = 200


def _harness(tmp_path: Path, *, openrouter_key: str | None = OPENROUTER_KEY) -> Iterator[ImageHarness]:
    settings = make_settings(
        tmp_path,
        **{"openrouter_api_key": openrouter_key if openrouter_key is not None else ""},
    )
    redis = FakeAsyncRedis(decode_responses=True)
    state = ImageHarness(client=None, settings=settings)  # type: ignore[arg-type]

    def handler(request: httpx.Request) -> httpx.Response:
        state.calls.append(request)
        url = str(request.url)
        if url == OPENROUTER_DECISIONS_URL:
            return httpx.Response(200, json={
                "answers": {"tool": {"choice": state.jev_choice, "confidence": 0.8}},
                "usage": {"prompt_tokens": 10, "completion_tokens": 1},
            })
        if url == OPENROUTER_IMAGES_URL:
            if state.image_status >= 400:
                return httpx.Response(state.image_status, json={"error": f"fail {OPENROUTER_KEY}"})
            return httpx.Response(200, json={
                "data": [{"b64_json": TINY_PNG, "media_type": "image/png"}],
                "usage": {"prompt_tokens": 12, "completion_tokens": 196, "cost": 0.006},
            })
        return httpx.Response(404, json={"detail": "unexpected"})

    http_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    app = create_app(settings=settings, redis_client=redis, http_client=http_client)
    with TestClient(app) as client:
        state.client = client
        yield state


@pytest.fixture
def image_harness(tmp_path: Path) -> Iterator[ImageHarness]:
    yield from _harness(tmp_path)


def _token(harness: ImageHarness) -> str:
    provision_user("op@example.com", "secret", settings=harness.settings)
    login = harness.client.post("/v1/auth/login", json={"email": "op@example.com", "password": "secret"})
    assert login.status_code == 200
    return login.json()["token"]


def test_generate_requires_auth(image_harness: ImageHarness) -> None:
    response = image_harness.client.post("/v1/images/generate", json={"prompt": "a cat"})
    assert response.status_code == 401
    assert image_harness.calls == []


def test_generate_jev_picks_model(image_harness: ImageHarness) -> None:
    token = _token(image_harness)
    response = image_harness.client.post(
        "/v1/images/generate",
        headers={"Authorization": f"Bearer {token}"},
        json={"prompt": "a red mug"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["model"] == "qwen-image-3"
    assert body["images"][0]["mediaType"] == "image/png"
    assert body["images"][0]["b64"]
    assert OPENROUTER_KEY not in response.text
    urls = [str(call.url) for call in image_harness.calls]
    assert OPENROUTER_DECISIONS_URL in urls
    assert OPENROUTER_IMAGES_URL in urls
    image_body = json_body(image_harness.calls[-1])
    assert image_body["model"] == "qwen/qwen-image-3"
    assert "quality" not in image_body


def test_generate_gpt_forces_low_quality(image_harness: ImageHarness) -> None:
    token = _token(image_harness)
    response = image_harness.client.post(
        "/v1/images/generate",
        headers={"Authorization": f"Bearer {token}"},
        json={"prompt": "logo", "model": "gpt-image-2", "n": 2},
    )
    assert response.status_code == 200
    image_body = json_body(next(call for call in image_harness.calls if str(call.url) == OPENROUTER_IMAGES_URL))
    assert image_body["model"] == "openai/gpt-image-2"
    assert image_body["quality"] == "low"
    assert image_body["n"] == 2


def test_edit_sends_references(image_harness: ImageHarness) -> None:
    token = _token(image_harness)
    response = image_harness.client.post(
        "/v1/images/generate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "prompt": "make it blue",
            "model": "gpt-image-2",
            "references": [{"b64": TINY_PNG, "mediaType": "image/png"}],
        },
    )
    assert response.status_code == 200
    image_body = json_body(next(call for call in image_harness.calls if str(call.url) == OPENROUTER_IMAGES_URL))
    refs = image_body["input_references"]
    assert isinstance(refs, list) and refs[0].startswith("data:image/png;base64,")


def json_body(request: httpx.Request) -> dict[str, object]:
    return json.loads(request.content.decode("utf-8"))
