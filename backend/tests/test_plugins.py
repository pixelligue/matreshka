from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass, field
from pathlib import Path

import httpx
import pytest
from fakeredis import FakeAsyncRedis
from fastapi.testclient import TestClient

from matreshka_api.amadeus import reset_token_cache
from matreshka_api.auth import provision_user
from matreshka_api.main import create_app
from matreshka_api.settings import Settings
from tests.conftest import make_settings

SECRET = "amo-long-lived-token-secret"


@dataclass
class PluginHarness:
    client: TestClient
    settings: Settings
    calls: list[httpx.Request] = field(default_factory=list)
    upstream_status: int = 200
    upstream_json: dict[str, object] = field(default_factory=dict)
    upstream_text: str | None = None


@pytest.fixture
def harness(tmp_path: Path) -> Iterator[PluginHarness]:
    settings = make_settings(tmp_path)
    redis = FakeAsyncRedis(decode_responses=True)
    state = PluginHarness(
        client=None,  # type: ignore[arg-type]
        settings=settings,
        upstream_json={"_embedded": {"leads": [{"id": 1, "name": "Deal"}]}},
    )

    def handler(request: httpx.Request) -> httpx.Response:
        state.calls.append(request)
        if "/oauth2/token" in str(request.url):
            return httpx.Response(200, json={"access_token": "ama-token", "expires_in": 1799})
        if state.upstream_status >= 400:
            text = state.upstream_text if state.upstream_text is not None else f"fail {SECRET}"
            return httpx.Response(state.upstream_status, text=text)
        return httpx.Response(200, json=state.upstream_json)

    http_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    app = create_app(settings=settings, redis_client=redis, http_client=http_client)
    with TestClient(app) as client:
        state.client = client
        yield state
    reset_token_cache()


def _token(h: PluginHarness) -> str:
    provision_user("op@example.com", "secret", settings=h.settings)
    response = h.client.post(
        "/v1/auth/login",
        json={"email": "op@example.com", "password": "secret"},
    )
    assert response.status_code == 200
    return response.json()["token"]


def test_unauthenticated_connect_is_401(harness: PluginHarness) -> None:
    response = harness.client.post(
        "/v1/plugins/amocrm/connect",
        json={"subdomain": "acme", "token": SECRET},
    )
    assert response.status_code == 401


def test_list_four_plugins_without_documents(harness: PluginHarness) -> None:
    token = _token(harness)
    response = harness.client.get(
        "/v1/plugins",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    ids = [row["id"] for row in response.json()]
    assert ids == ["amocrm", "bitrix24", "tilda", "hotels"]
    assert "documents" not in ids
    assert SECRET not in response.text


def test_hotels_connect_is_400(harness: PluginHarness) -> None:
    token = _token(harness)
    response = harness.client.post(
        "/v1/plugins/hotels/connect",
        headers={"Authorization": f"Bearer {token}"},
        json={"token": SECRET},
    )
    assert response.status_code == 400


def test_call_without_connection_is_409(harness: PluginHarness) -> None:
    token = _token(harness)
    response = harness.client.post(
        "/v1/plugins/amocrm/call",
        headers={"Authorization": f"Bearer {token}"},
        json={"path": "leads"},
    )
    assert response.status_code == 409
    assert harness.calls == []


def test_amocrm_connect_and_call_hides_secret(harness: PluginHarness) -> None:
    token = _token(harness)
    connected = harness.client.post(
        "/v1/plugins/amocrm/connect",
        headers={"Authorization": f"Bearer {token}"},
        json={"subdomain": "acme", "token": SECRET},
    )
    assert connected.status_code == 200
    assert connected.json() == {"id": "amocrm", "enabled": True, "connected": True}
    assert SECRET not in connected.text
    status = harness.client.get(
        "/v1/plugins/amocrm",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert status.json()["connected"] is True
    assert SECRET not in status.text
    called = harness.client.post(
        "/v1/plugins/amocrm/call",
        headers={"Authorization": f"Bearer {token}"},
        json={"path": "leads", "query": {"limit": "2"}},
    )
    assert called.status_code == 200
    assert called.json()["_embedded"]["leads"][0]["name"] == "Deal"
    assert SECRET not in called.text
    request = harness.calls[0]
    assert str(request.url).startswith("https://acme.amocrm.ru/api/v4/leads")
    assert request.headers["authorization"] == f"Bearer {SECRET}"


def test_bitrix24_connect_hides_webhook(harness: PluginHarness) -> None:
    token = _token(harness)
    webhook = "https://acme.bitrix24.ru/rest/1/webhook-secret/"
    connected = harness.client.post(
        "/v1/plugins/bitrix24/connect",
        headers={"Authorization": f"Bearer {token}"},
        json={"webhook_url": webhook},
    )
    assert connected.status_code == 200
    assert connected.json() == {"id": "bitrix24", "enabled": True, "connected": True}
    assert "webhook-secret" not in connected.text
    status = harness.client.get(
        "/v1/plugins/bitrix24",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert status.json()["connected"] is True
    assert "webhook-secret" not in status.text


def test_tilda_upstream_error_redacts_secret(harness: PluginHarness) -> None:
    token = _token(harness)
    secret = "tilda-secret-key"
    harness.client.post(
        "/v1/plugins/tilda/connect",
        headers={"Authorization": f"Bearer {token}"},
        json={"public_key": "pub", "secret_key": secret},
    )
    harness.upstream_status = 500
    harness.upstream_text = f"fail {secret}"
    called = harness.client.post(
        "/v1/plugins/tilda/call",
        headers={"Authorization": f"Bearer {token}"},
        json={"path": "getprojectslist"},
    )
    assert called.status_code == 502
    assert secret not in called.text


def test_disabled_connected_plugin_call_is_409(harness: PluginHarness) -> None:
    token = _token(harness)
    harness.client.post(
        "/v1/plugins/amocrm/connect",
        headers={"Authorization": f"Bearer {token}"},
        json={"subdomain": "acme", "token": SECRET},
    )
    disabled = harness.client.post(
        "/v1/plugins/amocrm/enable",
        headers={"Authorization": f"Bearer {token}"},
        json={"enabled": False},
    )
    assert disabled.json() == {"id": "amocrm", "enabled": False, "connected": True}
    called = harness.client.post(
        "/v1/plugins/amocrm/call",
        headers={"Authorization": f"Bearer {token}"},
        json={"path": "leads"},
    )
    assert called.status_code == 409
    assert harness.calls == []


def test_hotels_connected_when_amadeus_configured(tmp_path: Path) -> None:
    settings = make_settings(
        tmp_path,
        amadeus_client_id="ama-id",
        amadeus_client_secret="ama-secret",
    )
    redis = FakeAsyncRedis(decode_responses=True)
    http_client = httpx.AsyncClient(transport=httpx.MockTransport(lambda _request: httpx.Response(200, json={})))
    app = create_app(settings=settings, redis_client=redis, http_client=http_client)
    with TestClient(app) as client:
        provision_user("op@example.com", "secret", settings=settings)
        login = client.post("/v1/auth/login", json={"email": "op@example.com", "password": "secret"})
        token = login.json()["token"]
        status = client.get("/v1/plugins/hotels", headers={"Authorization": f"Bearer {token}"})
        assert status.json() == {"id": "hotels", "enabled": False, "connected": True}
        assert "ama-secret" not in status.text


def test_hotels_call_lists_by_city(harness: PluginHarness) -> None:
    harness.settings.amadeus_client_id = "ama-id"
    harness.settings.amadeus_client_secret = "ama-secret"
    harness.upstream_json = {"data": [{"hotelId": "ACPAR001", "name": "Test Hotel"}]}
    token = _token(harness)
    harness.client.post(
        "/v1/plugins/hotels/enable",
        headers={"Authorization": f"Bearer {token}"},
        json={"enabled": True},
    )
    called = harness.client.post(
        "/v1/plugins/hotels/call",
        headers={"Authorization": f"Bearer {token}"},
        json={"path": "hotels/by-city", "query": {"cityCode": "PAR"}},
    )
    assert called.status_code == 200
    assert called.json()["data"][0]["hotelId"] == "ACPAR001"
    assert "ama-secret" not in called.text
    urls = [str(request.url) for request in harness.calls]
    assert any("/v1/security/oauth2/token" in url for url in urls)
    assert any("/v1/reference-data/locations/hotels/by-city" in url for url in urls)
    hotel_call = next(request for request in harness.calls if "hotels/by-city" in str(request.url))
    assert hotel_call.headers["authorization"] == "Bearer ama-token"


def test_hotels_call_without_key_is_503(harness: PluginHarness) -> None:
    token = _token(harness)
    harness.client.post(
        "/v1/plugins/hotels/enable",
        headers={"Authorization": f"Bearer {token}"},
        json={"enabled": True},
    )
    called = harness.client.post(
        "/v1/plugins/hotels/call",
        headers={"Authorization": f"Bearer {token}"},
        json={"path": "hotels/by-city", "query": {"cityCode": "PAR"}},
    )
    assert called.status_code == 503
    assert harness.calls == []


def test_amocrm_upstream_error_redacts_secret(harness: PluginHarness) -> None:
    token = _token(harness)
    harness.client.post(
        "/v1/plugins/amocrm/connect",
        headers={"Authorization": f"Bearer {token}"},
        json={"subdomain": "acme", "token": SECRET},
    )
    harness.upstream_status = 500
    called = harness.client.post(
        "/v1/plugins/amocrm/call",
        headers={"Authorization": f"Bearer {token}"},
        json={"path": "leads"},
    )
    assert called.status_code == 502
    assert SECRET not in called.text
