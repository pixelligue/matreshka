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
from matreshka_api.settings import Settings
from matreshka_api.web_search import KEENABLE_PUBLIC_SEARCH, KEENABLE_TITLE, sources_from_payload
from tests.conftest import TEST_UPSTREAM_KEY, make_settings


@dataclass
class SearchHarness:
    client: TestClient
    settings: Settings
    calls: list[httpx.Request] = field(default_factory=list)


@pytest.fixture
def search_harness(tmp_path: Path) -> Iterator[SearchHarness]:
    settings = make_settings(tmp_path)
    redis = FakeAsyncRedis(decode_responses=True)
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        url = str(request.url)
        if url.startswith(KEENABLE_PUBLIC_SEARCH):
            return httpx.Response(
                200,
                json={
                    "query": "typescript",
                    "results": [{
                        "title": "TS",
                        "url": "https://example.com/ts",
                        "snippet": "types",
                    }],
                },
            )
        if url.endswith("/search"):
            return httpx.Response(
                200,
                json={
                    "object": "list",
                    "data": [{
                        "title": "RAG",
                        "url": "https://example.com/rag",
                        "snippet": "retrieval",
                        "publishedAt": "2026-01-01T00:00:00Z",
                    }],
                    "usage": {},
                },
            )
        return httpx.Response(404, json={"detail": "unexpected"})

    http_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    app = create_app(settings=settings, redis_client=redis, http_client=http_client)
    with TestClient(app) as client:
        yield SearchHarness(client=client, settings=settings, calls=calls)


def _token(harness: SearchHarness) -> str:
    provision_user("op@example.com", "secret", settings=harness.settings)
    response = harness.client.post(
        "/v1/auth/login",
        json={"email": "op@example.com", "password": "secret"},
    )
    assert response.status_code == 200
    return response.json()["token"]


def test_unauthenticated_search_is_401(search_harness: SearchHarness) -> None:
    response = search_harness.client.post("/v1/web/search", json={"query": "q"})
    assert response.status_code == 401
    assert search_harness.calls == []


def test_keenable_default_search(search_harness: SearchHarness) -> None:
    token = _token(search_harness)
    response = search_harness.client.post(
        "/v1/web/search",
        json={"query": "typescript"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["sources"][0]["url"] == "https://example.com/ts"
    assert len(search_harness.calls) == 1
    assert str(search_harness.calls[0].url) == KEENABLE_PUBLIC_SEARCH
    assert search_harness.calls[0].headers["x-keenable-title"] == KEENABLE_TITLE
    assert "authorization" not in search_harness.calls[0].headers


def test_llmtokenapi_search_hides_key(search_harness: SearchHarness) -> None:
    token = _token(search_harness)
    response = search_harness.client.post(
        "/v1/web/search",
        json={"query": "rag", "provider": "llmtokenapi"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.text
    assert TEST_UPSTREAM_KEY not in body
    assert response.json()["sources"][0]["url"] == "https://example.com/rag"
    assert len(search_harness.calls) == 1
    assert str(search_harness.calls[0].url).endswith("/search")
    assert search_harness.calls[0].headers["authorization"] == f"Bearer {TEST_UPSTREAM_KEY}"


def test_llmtokenapi_data_envelope_maps_sources() -> None:
    sources = sources_from_payload(
        {
            "object": "list",
            "data": [{"url": "https://example.com/a", "title": "A", "snippet": "s"}],
            "usage": {},
        },
        8,
    )
    assert sources[0].url == "https://example.com/a"
    assert sources[0].title == "A"


def test_unknown_search_provider_is_400(search_harness: SearchHarness) -> None:
    token = _token(search_harness)
    response = search_harness.client.post(
        "/v1/web/search",
        json={"query": "q", "provider": "exa"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400
    assert search_harness.calls == []
