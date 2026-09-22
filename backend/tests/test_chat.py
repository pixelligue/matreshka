from __future__ import annotations

import json

import httpx
from fakeredis import FakeAsyncRedis
from fastapi.testclient import TestClient

from matreshka_api.auth import provision_user
from matreshka_api.chat import MATRENA_OPENROUTER_MODEL, MATRENA_UPSTREAM_MODELS
from matreshka_api.main import UPSTREAM_HTTP_TIMEOUT, create_app
from tests.conftest import (
    DEFAULT_SSE,
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
UPSTREAM_MODEL = MATRENA_UPSTREAM_MODELS[0]


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


def test_glm_vendor_id_is_rejected(harness: AppHarness) -> None:
    token = _token(harness)
    response = harness.client.post(
        "/v1/chat/completions",
        json={**CHAT_BODY, "model": "zai-org/GLM-5.3-Flash"},
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


def test_retries_second_gonka_model_after_502(tmp_path) -> None:
    settings = make_settings(tmp_path)
    redis = FakeAsyncRedis(decode_responses=True)
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        sent = json.loads(request.content)
        if sent["model"] == MATRENA_UPSTREAM_MODELS[0]:
            return httpx.Response(502, text="")
        body = (
            'data: {"id":"chatcmpl-mock","object":"chat.completion.chunk",'
            '"created":1,"model":"deepseek-ai/DeepSeek-V4-Flash-0731",'
            '"choices":[{"index":0,"delta":{"content":"Hello"}}]}\n\n'
            "data: [DONE]\n\n"
        )
        return httpx.Response(200, headers={"content-type": "text/event-stream"}, content=body)

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
    assert [json.loads(call.content)["model"] for call in calls] == list(MATRENA_UPSTREAM_MODELS)
    assert "zai-org/GLM-5.3-Flash" not in response.text
    assert "deepseek-ai/DeepSeek-V4-Flash-0731" not in response.text
    assert '"model":"matrena"' in response.text.replace(" ", "")


def test_gonka_400_tries_the_second_model(tmp_path) -> None:
    settings = make_settings(tmp_path)
    redis = FakeAsyncRedis(decode_responses=True)
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        sent = json.loads(request.content)
        if sent["model"] == MATRENA_UPSTREAM_MODELS[0]:
            return httpx.Response(400, text="bad request")
        body = (
            'data: {"choices":[{"delta":{"content":"pong"}}],"model":"deepseek-ai/DeepSeek-V4-Flash-0731"}\n\n'
            "data: [DONE]\n\n"
        )
        return httpx.Response(200, headers={"content-type": "text/event-stream"}, content=body)

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
    assert [json.loads(call.content)["model"] for call in calls] == list(MATRENA_UPSTREAM_MODELS)


def test_openrouter_is_last_after_both_gonka_models_fail(tmp_path) -> None:
    settings = make_settings(tmp_path, openrouter_api_key="sk_or_test")
    redis = FakeAsyncRedis(decode_responses=True)
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        if request.url.host != "openrouter.ai":
            return httpx.Response(503, text="")
        body = (
            'data: {"id":"chatcmpl-or","object":"chat.completion.chunk",'
            '"created":1,"model":"z-ai/glm-5.3-flash",'
            '"choices":[{"index":0,"delta":{"content":"pong"}}]}\n\n'
            "data: [DONE]\n\n"
        )
        return httpx.Response(200, headers={"content-type": "text/event-stream"}, content=body)

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
    sent = [json.loads(call.content)["model"] for call in calls]
    assert sent == [*MATRENA_UPSTREAM_MODELS, MATRENA_OPENROUTER_MODEL]
    assert calls[-1].url.host == "openrouter.ai"
    assert "z-ai/glm-5.3-flash" not in response.text
    assert '"model":"matrena"' in response.text.replace(" ", "")
    assert "sk_or_test" not in response.text


def test_gonka_auth_failure_skips_to_openrouter(tmp_path) -> None:
    settings = make_settings(tmp_path, openrouter_api_key="sk_or_test")
    redis = FakeAsyncRedis(decode_responses=True)
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        if request.url.host != "openrouter.ai":
            return httpx.Response(401, text="no")
        body = (
            'data: {"choices":[{"delta":{"content":"pong"}}],"model":"z-ai/glm-5.3-flash"}\n\n'
            "data: [DONE]\n\n"
        )
        return httpx.Response(200, headers={"content-type": "text/event-stream"}, content=body)

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
    sent = [json.loads(call.content)["model"] for call in calls]
    assert sent == [MATRENA_UPSTREAM_MODELS[0], MATRENA_OPENROUTER_MODEL]


def test_auth_failure_does_not_try_the_second_model(tmp_path) -> None:
    settings = make_settings(tmp_path)
    redis = FakeAsyncRedis(decode_responses=True)
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(401, text="no")

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
    assert len(calls) == 1


def test_missing_gonka_key_is_503_without_upstream(tmp_path) -> None:
    settings = make_settings(tmp_path, llm_upstream_api_key=None)
    redis = FakeAsyncRedis(decode_responses=True)
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, content=DEFAULT_SSE)

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
    assert response.status_code == 503
    assert calls == []


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
