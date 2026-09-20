from __future__ import annotations

import json

import httpx
from fakeredis import FakeAsyncRedis
from fastapi.testclient import TestClient

from matreshka_api.auth import provision_user
from matreshka_api.main import create_app
from matreshka_api.openrouter import OPENROUTER_CHAT_URL, OPENROUTER_DECISIONS_URL
from matreshka_api.usage import llmtokenapi_charge, openrouter_charge, token_counts
from matreshka_api.web_search import KEENABLE_PUBLIC_SEARCH
from tests.conftest import make_settings


def _token(client: TestClient, settings, email: str) -> str:
    provision_user(email, "secret", settings=settings)
    response = client.post("/v1/auth/login", json={"email": email, "password": "secret"})
    assert response.status_code == 200
    return response.json()["token"]


def test_usage_records_cost_sources_without_prompts_and_is_user_scoped(tmp_path) -> None:
    settings = make_settings(tmp_path, openrouter_api_key="sk-or-test")

    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if url.endswith("/chat/completions") and "upstream.test" in url:
            return httpx.Response(200, content=(
                'data: {"id":"chat-one","choices":[{"delta":{"content":"ok"}}]}\n\n'
                'data: {"id":"chat-one","choices":[],"usage":'
                '{"prompt_tokens":200,"completion_tokens":10,"charged_kopecks":3}}\n\n'
                'data: [DONE]\n\n'
            ))
        if url == OPENROUTER_CHAT_URL:
            return httpx.Response(200, json={
                "id": "consult-one",
                "choices": [{"message": {"content": '{"verdict":"ok","detail":"done"}'}}],
                "usage": {"prompt_tokens": 120, "completion_tokens": 20, "cost": 0.000123},
            })
        if url == OPENROUTER_DECISIONS_URL:
            return httpx.Response(200, json={
                "id": "jev-one",
                "answers": {"tool": {"choice": "web_search", "confidence": 0.9}},
                "usage": {"input_tokens": 80, "output_tokens": 0},
            })
        if url == KEENABLE_PUBLIC_SEARCH:
            return httpx.Response(200, json={"results": [{"url": "https://example.com"}]})
        if url.endswith("/search") and "upstream.test" in url:
            return httpx.Response(200, json={
                "data": [{"url": "https://example.com"}],
                "usage": {"requests": 1, "charged_kopecks": 15},
            })
        return httpx.Response(404)

    app = create_app(
        settings=settings,
        redis_client=FakeAsyncRedis(decode_responses=True),
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    with TestClient(app) as client:
        first = _token(client, settings, "first@example.com")
        auth = {"Authorization": f"Bearer {first}"}
        chat = client.post("/v1/chat/completions", headers=auth, json={
            "model": "matrena", "stream": True,
            "messages": [{"role": "user", "content": "secret question"}],
            "tools": [{"type": "function", "function": {"name": "web_search"}}],
        })
        assert chat.status_code == 200
        assert client.post("/v1/consult", headers=auth, json={
            "goal": "secret goal", "question": "check",
        }).status_code == 200
        assert client.post("/v1/tools/select", headers=auth, json={
            "goal": "search", "candidates": ["web_search"],
        }).status_code == 200
        assert client.post("/v1/web/search", headers=auth, json={
            "query": "secret search", "provider": "llmtokenapi",
        }).status_code == 200
        assert client.post("/v1/web/search", headers=auth, json={
            "query": "public search",
        }).status_code == 200

        events_response = client.get("/v1/usage/events", headers=auth)
        assert events_response.status_code == 200
        events = events_response.json()
        assert len(events) == 5
        assert "secret" not in events_response.text
        by_operation = {event["operation"]: event for event in events if event["operation"] != "web_search"}
        assert by_operation["chat"]["input_tokens"] == 200
        assert by_operation["chat"]["output_tokens"] == 10
        assert by_operation["chat"]["amount_nanos"] == 30_000_000
        assert by_operation["chat"]["currency"] == "RUB"
        assert by_operation["chat"]["amount_source"] == "reported"
        assert by_operation["chat"]["tool_count"] == 1
        assert by_operation["chat"]["tool_schema_bytes"] > 0
        assert by_operation["chat"]["result_bytes"] > 0
        assert by_operation["consult"]["amount_nanos"] == 123_000
        assert by_operation["consult"]["amount_source"] == "reported"
        assert by_operation["select_tool"]["amount_source"] == "rate_estimate"
        assert by_operation["select_tool"]["amount_nanos"] == 3_360
        searches = [event for event in events if event["operation"] == "web_search"]
        assert {event["provider"]: event["amount_nanos"] for event in searches} == {
            "llmtokenapi": 150_000_000, "keenable": None,
        }

        summary = client.get("/v1/usage/summary", headers=auth)
        assert summary.status_code == 200
        rows = summary.json()["rows"]
        assert sum(row["requests"] for row in rows) == 5
        assert any(row["amount_source"] is None and row["amount_nanos"] is None for row in rows)
        assert any(row["operation"] == "chat" and row["input_tokens"] == 200 for row in rows)

        second = _token(client, settings, "second@example.com")
        other = {"Authorization": f"Bearer {second}"}
        assert client.get("/v1/usage/events", headers=other).json() == []
        assert client.get("/v1/usage/summary", headers=other).json() == {"rows": []}
        assert client.get("/v1/usage/events").status_code == 401


def test_failed_upstream_attempt_is_recorded_with_unknown_cost(tmp_path) -> None:
    settings = make_settings(tmp_path, openrouter_api_key="sk-or-test")

    def handler(request: httpx.Request) -> httpx.Response:
        if str(request.url) == OPENROUTER_CHAT_URL:
            return httpx.Response(503, json={"error": "unavailable"})
        return httpx.Response(404)

    app = create_app(
        settings=settings,
        redis_client=FakeAsyncRedis(decode_responses=True),
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    with TestClient(app) as client:
        token = _token(client, settings, "first@example.com")
        auth = {"Authorization": f"Bearer {token}"}
        response = client.post("/v1/consult", headers=auth, json={"goal": "g", "question": "q"})
        assert response.status_code == 502
        events = client.get("/v1/usage/events", headers=auth).json()
        assert len(events) == 1
        assert events[0]["status"] == "http_error"
        assert events[0]["amount_nanos"] is None
        assert events[0]["input_tokens"] is None


def test_invalid_provider_usage_remains_unknown() -> None:
    payload = {"usage": {"prompt_tokens": True, "completion_tokens": -1, "cost": "NaN"}}
    counts = token_counts(payload)
    assert counts.input_tokens is None
    assert counts.output_tokens is None
    assert openrouter_charge(payload, 0.001) is None
    assert llmtokenapi_charge({"usage": {"charged_kopecks": 2**63}}) is None
    assert llmtokenapi_charge({"usage": {"charged_kopecks": 0}}).amount_nanos == 0


def test_daily_report_and_aptabase_projection_keep_cost_sources_and_privacy(tmp_path) -> None:
    settings = make_settings(
        tmp_path,
        openrouter_api_key="sk-or-test",
        matreshka_aptabase_usage_app_key="A-SH-cost-test",
        matreshka_aptabase_host="http://aptabase.test",
    )
    analytics: list[dict] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if str(request.url) == OPENROUTER_CHAT_URL:
            return httpx.Response(200, json={
                "id": "private-generation-id",
                "choices": [{"message": {"content": '{"verdict":"ok","detail":"done"}'}}],
                "usage": {"prompt_tokens": 120, "completion_tokens": 20, "cost": 0.000123},
            })
        if str(request.url) == "http://aptabase.test/api/v0/event":
            assert request.headers["App-Key"] == "A-SH-cost-test"
            analytics.append(json.loads(request.content))
            return httpx.Response(202)
        return httpx.Response(404)

    app = create_app(
        settings=settings,
        redis_client=FakeAsyncRedis(decode_responses=True),
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    with TestClient(app) as client:
        token = _token(client, settings, "first@example.com")
        auth = {"Authorization": f"Bearer {token}"}
        response = client.post("/v1/consult", headers=auth, json={
            "goal": "secret goal", "question": "private question",
        })
        assert response.status_code == 200
        report = client.get("/v1/usage/report?days=7", headers=auth)
        assert report.status_code == 200
        rows = report.json()["rows"]
        assert len(rows) == 1
        assert rows[0]["operation"] == "consult"
        assert rows[0]["currency"] == "USD"
        assert rows[0]["amount_source"] == "reported"
        assert rows[0]["amount_nanos"] == 123_000
        assert rows[0]["requests"] == 1
        assert client.get("/v1/usage/report?days=0", headers=auth).status_code == 422
        assert client.get("/v1/usage/report").status_code == 401
        other = _token(client, settings, "second@example.com")
        assert client.get("/v1/usage/report", headers={"Authorization": f"Bearer {other}"}).json()["rows"] == []
        page = client.get("/analytics/costs")
        assert page.status_code == 200
        assert "Расходы на ИИ" in page.text
        assert "Content-Security-Policy" in page.headers
        assert client.get("/analytics/costs.js").status_code == 200
    assert len(analytics) == 1
    assert analytics[0]["eventName"] == "upstream_usage"
    assert analytics[0]["props"]["amount_nanos"] == 123_000
    assert analytics[0]["props"]["amount_source"] == "reported"
    assert "secret goal" not in str(analytics)
    assert "private question" not in str(analytics)
    assert "private-generation-id" not in str(analytics)
    assert "first@example.com" not in str(analytics)


def test_aptabase_outage_does_not_change_committed_usage_or_response(tmp_path) -> None:
    settings = make_settings(
        tmp_path,
        openrouter_api_key="sk-or-test",
        matreshka_aptabase_usage_app_key="A-SH-cost-test",
        matreshka_aptabase_host="http://aptabase.test",
    )

    def handler(request: httpx.Request) -> httpx.Response:
        if str(request.url) == OPENROUTER_CHAT_URL:
            return httpx.Response(200, json={
                "choices": [{"message": {"content": '{"verdict":"ok","detail":"done"}'}}],
                "usage": {"prompt_tokens": 1, "completion_tokens": 1, "cost": 0.000001},
            })
        return httpx.Response(503)

    app = create_app(
        settings=settings,
        redis_client=FakeAsyncRedis(decode_responses=True),
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    with TestClient(app) as client:
        token = _token(client, settings, "first@example.com")
        auth = {"Authorization": f"Bearer {token}"}
        assert client.post("/v1/consult", headers=auth, json={"goal": "g", "question": "q"}).status_code == 200
        rows = client.get("/v1/usage/report", headers=auth).json()["rows"]
        assert len(rows) == 1
        assert rows[0]["amount_nanos"] == 1_000
