from __future__ import annotations

import json

import httpx
from fakeredis import FakeAsyncRedis
from fastapi.testclient import TestClient

from matreshka_api.auth import provision_user
from matreshka_api.main import UPSTREAM_HTTP_TIMEOUT, create_app
from tests.conftest import (
    TEST_UPSTREAM_KEY,
    AppHarness,
    make_settings,
)
from tests.sse_parser import DONE, parse_sse

CHAT_BODY = {
    "model": "matrena",
    "messages": [{"role": "user", "content": "hi"}],
    "stream": True,
}
UPSTREAM_MODEL = "deepseek-ai-deepseek-v4-flash-0731"


def _token(harness: AppHarness) -> str:
    provision_user("op@example.com", "secret", settings=harness.settings)
    response = harness.client.post(
        "/v1/auth/login",
        json={"email": "op@example.com", "password": "secret"},
    )
    assert response.status_code == 200
    return response.json()["token"]


def test_upstream_http_read_timeout_allows_tool_call_pause() -> None:
    assert UPSTREAM_HTTP_TIMEOUT.read == 300.0


def test_stream_false_returns_400(harness: AppHarness) -> None:
    token = _token(harness)
    response = harness.client.post(
        "/v1/chat/completions",
        json={**CHAT_BODY, "stream": False},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400
    assert harness.upstream_calls == []


def test_stream_false_without_token_is_401(harness: AppHarness) -> None:
    response = harness.client.post(
        "/v1/chat/completions",
        json={**CHAT_BODY, "stream": False},
    )
    assert response.status_code == 401


def test_unauthenticated_chat_is_401_without_sse_body(harness: AppHarness) -> None:
    response = harness.client.post("/v1/chat/completions", json=CHAT_BODY)
    assert response.status_code == 401
    content_type = response.headers.get("content-type", "")
    assert not content_type.startswith("text/event-stream")
    assert "data:" not in response.text
    assert harness.upstream_calls == []


def test_authenticated_upstream_stream_is_event_stream(harness: AppHarness) -> None:
    token = _token(harness)
    response = harness.client.post(
        "/v1/chat/completions",
        json=CHAT_BODY,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    payloads = parse_sse(response.text)
    assert payloads[-1] == DONE
    found_content = False
    for payload in payloads[:-1]:
        chunk = json.loads(payload)
        content = chunk["choices"][0]["delta"].get("content")
        if isinstance(content, str) and content:
            found_content = True
    assert found_content
    assert len(harness.upstream_calls) == 1
    sent = json.loads(harness.upstream_calls[0].content)
    assert sent["model"] == UPSTREAM_MODEL
    assert sent["stream"] is True
    assert UPSTREAM_MODEL not in response.text
    for payload in payloads[:-1]:
        chunk = json.loads(payload)
        if "model" in chunk:
            assert chunk["model"] == "matrena"


def test_tools_are_forwarded_upstream(harness: AppHarness) -> None:
    token = _token(harness)
    tools = [{
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web",
            "parameters": {"type": "object", "properties": {"query": {"type": "string"}}},
        },
    }]
    response = harness.client.post(
        "/v1/chat/completions",
        json={**CHAT_BODY, "tools": tools, "tool_choice": "auto"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    sent = json.loads(harness.upstream_calls[0].content)
    assert sent["tools"] == tools
    assert sent["tool_choice"] == "auto"
    assert sent["model"] == UPSTREAM_MODEL


def test_stream_omitted_is_sse(harness: AppHarness) -> None:
    token = _token(harness)
    body = {
        "model": "matrena",
        "messages": [{"role": "user", "content": "hi"}],
    }
    response = harness.client.post(
        "/v1/chat/completions",
        json=body,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")


def test_unknown_model_is_400_without_upstream(harness: AppHarness) -> None:
    token = _token(harness)
    response = harness.client.post(
        "/v1/chat/completions",
        json={**CHAT_BODY, "model": "matreshka-stub"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400
    assert harness.upstream_calls == []


def test_vendor_model_id_is_rejected(harness: AppHarness) -> None:
    token = _token(harness)
    response = harness.client.post(
        "/v1/chat/completions",
        json={**CHAT_BODY, "model": UPSTREAM_MODEL},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400
    assert harness.upstream_calls == []


def test_gonka_vendor_id_is_rejected(harness: AppHarness) -> None:
    token = _token(harness)
    response = harness.client.post(
        "/v1/chat/completions",
        json={**CHAT_BODY, "model": "deepseek-ai/DeepSeek-V4-Flash-0731"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400
    assert harness.upstream_calls == []


def test_appends_done_when_upstream_omits_it(tmp_path) -> None:
    settings = make_settings(tmp_path)
    redis = FakeAsyncRedis(decode_responses=True)

    def handler(_request: httpx.Request) -> httpx.Response:
        body = (
            'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n'
        )
        return httpx.Response(
            200,
            headers={"content-type": "text/event-stream"},
            content=body,
        )

    app = create_app(
        settings=settings,
        redis_client=redis,
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    with TestClient(app) as client:
        provision_user("op@example.com", "secret", settings=settings)
        token = client.post(
            "/v1/auth/login",
            json={"email": "op@example.com", "password": "secret"},
        ).json()["token"]
        response = client.post(
            "/v1/chat/completions",
            json=CHAT_BODY,
            headers={"Authorization": f"Bearer {token}"},
        )
    assert response.status_code == 200
    payloads = parse_sse(response.text)
    assert payloads[-1] == DONE


def test_upstream_5xx_is_502_without_key(tmp_path) -> None:
    settings = make_settings(tmp_path)
    redis = FakeAsyncRedis(decode_responses=True)

    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, text=f"boom {TEST_UPSTREAM_KEY}")

    app = create_app(
        settings=settings,
        redis_client=redis,
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    with TestClient(app) as client:
        provision_user("op@example.com", "secret", settings=settings)
        token = client.post(
            "/v1/auth/login",
            json={"email": "op@example.com", "password": "secret"},
        ).json()["token"]
        response = client.post(
            "/v1/chat/completions",
            json=CHAT_BODY,
            headers={"Authorization": f"Bearer {token}"},
        )
    assert response.status_code == 502
    assert TEST_UPSTREAM_KEY not in response.text


def test_health_does_not_call_upstream(harness: AppHarness) -> None:
    response = harness.client.get("/health")
    assert response.status_code == 200
    assert harness.upstream_calls == []
