"""CIS plugin connections: status, connect, and proxied upstream calls."""

from __future__ import annotations

import json
import re
from typing import Any, Literal

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlmodel import select

from matreshka_api.amadeus import (
    amadeus_access_token,
    amadeus_configured,
    amadeus_url,
)
from matreshka_api.auth import CurrentUserDep
from matreshka_api.chat import HttpClientDep, redact_secret
from matreshka_api.db import SessionDep, SettingsDep
from matreshka_api.models import PluginConnection, User
from matreshka_api.settings import Settings

router = APIRouter(prefix="/v1/plugins", tags=["plugins"])

PLUGIN_IDS = ("amocrm", "bitrix24", "tilda", "hotels")
CONNECTABLE = frozenset({"amocrm", "bitrix24", "tilda"})
AMO_PATH = re.compile(r"^(leads|contacts|companies|tasks|leads/pipelines)(/[0-9]+)?$")


class PluginStatus(BaseModel):
    id: str
    enabled: bool
    connected: bool


class ConnectRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    subdomain: str = ""
    token: str = ""
    webhook_url: str = ""
    public_key: str = ""
    secret_key: str = ""


class EnableRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    enabled: bool


class CallRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    method: Literal["GET", "POST", "PATCH"] = "GET"
    path: str = ""
    query: dict[str, str] = Field(default_factory=dict)
    body: Any = None


def _require_id(plugin_id: str) -> str:
    if plugin_id not in PLUGIN_IDS:
        raise HTTPException(status_code=404, detail="Unknown plugin")
    return plugin_id


async def _row(
    session: SessionDep,
    user: User,
    plugin_id: str,
) -> PluginConnection | None:
    result = await session.exec(
        select(PluginConnection).where(
            PluginConnection.user_id == user.id,
            PluginConnection.plugin_id == plugin_id,
        ),
    )
    return result.first()


def _status(
    plugin_id: str,
    row: PluginConnection | None,
    settings: Settings | None = None,
) -> PluginStatus:
    connected = bool(row is not None and row.secret)
    if plugin_id == "hotels":
        connected = bool(settings is not None and amadeus_configured(settings))
    return PluginStatus(
        id=plugin_id,
        enabled=bool(row is not None and row.enabled),
        connected=connected,
    )


def _secret_payload(row: PluginConnection | None) -> dict[str, str]:
    if row is None or not row.secret:
        return {}
    try:
        parsed = json.loads(row.secret)
    except json.JSONDecodeError:
        return {}
    if not isinstance(parsed, dict):
        return {}
    return {str(key): str(value) for key, value in parsed.items()}


@router.get("")
async def list_plugins(
    user: CurrentUserDep,
    session: SessionDep,
    settings: SettingsDep,
) -> list[PluginStatus]:
    return [
        _status(plugin_id, await _row(session, user, plugin_id), settings)
        for plugin_id in PLUGIN_IDS
    ]


@router.get("/{plugin_id}")
async def plugin_status(
    plugin_id: str,
    user: CurrentUserDep,
    session: SessionDep,
    settings: SettingsDep,
) -> PluginStatus:
    plugin_id = _require_id(plugin_id)
    return _status(plugin_id, await _row(session, user, plugin_id), settings)


@router.post("/{plugin_id}/enable")
async def enable_plugin(
    plugin_id: str,
    body: EnableRequest,
    user: CurrentUserDep,
    session: SessionDep,
    settings: SettingsDep,
) -> PluginStatus:
    plugin_id = _require_id(plugin_id)
    row = await _row(session, user, plugin_id)
    if row is None:
        row = PluginConnection(user_id=user.id, plugin_id=plugin_id, enabled=body.enabled, secret="")
        session.add(row)
    else:
        row.enabled = body.enabled
    await session.commit()
    await session.refresh(row)
    return _status(plugin_id, row, settings)


@router.post("/{plugin_id}/connect")
async def connect_plugin(
    plugin_id: str,
    body: ConnectRequest,
    user: CurrentUserDep,
    session: SessionDep,
) -> PluginStatus:
    plugin_id = _require_id(plugin_id)
    if plugin_id == "hotels":
        raise HTTPException(status_code=400, detail="Amadeus uses the product API key")
    payload = _connect_payload(plugin_id, body)
    row = await _row(session, user, plugin_id)
    encoded = json.dumps(payload)
    if row is None:
        row = PluginConnection(user_id=user.id, plugin_id=plugin_id, enabled=True, secret=encoded)
        session.add(row)
    else:
        row.secret = encoded
        row.enabled = True
    await session.commit()
    await session.refresh(row)
    return _status(plugin_id, row)


def _connect_payload(plugin_id: str, body: ConnectRequest) -> dict[str, str]:
    if plugin_id == "amocrm":
        subdomain = body.subdomain.strip().removesuffix(".amocrm.ru")
        token = body.token.strip()
        if not subdomain or not token:
            raise HTTPException(status_code=400, detail="subdomain and token are required")
        if not re.fullmatch(r"[a-zA-Z0-9-]+", subdomain):
            raise HTTPException(status_code=400, detail="invalid subdomain")
        return {"subdomain": subdomain, "token": token}
    if plugin_id == "bitrix24":
        url = body.webhook_url.strip()
        if not url.startswith("https://") or "/rest/" not in url:
            raise HTTPException(status_code=400, detail="webhook_url is required")
        return {"webhook_url": url.rstrip("/") + "/"}
    public_key = body.public_key.strip()
    secret_key = body.secret_key.strip()
    if not public_key or not secret_key:
        raise HTTPException(status_code=400, detail="public_key and secret_key are required")
    return {"public_key": public_key, "secret_key": secret_key}


@router.post("/{plugin_id}/call")
async def call_plugin(
    plugin_id: str,
    body: CallRequest,
    user: CurrentUserDep,
    session: SessionDep,
    http_client: HttpClientDep,
    settings: SettingsDep,
) -> dict[str, Any]:
    plugin_id = _require_id(plugin_id)
    row = await _row(session, user, plugin_id)
    if plugin_id == "hotels":
        if row is None or not row.enabled:
            raise HTTPException(status_code=409, detail="Plugin is disabled")
        if not amadeus_configured(settings):
            raise HTTPException(status_code=503, detail="Amadeus is not configured")
        try:
            return await _call_amadeus(http_client, settings, body)
        except HTTPException:
            raise
        except httpx.RequestError as exc:
            raise HTTPException(status_code=502, detail="Upstream unavailable") from exc
    secrets = _secret_payload(row)
    if not secrets:
        raise HTTPException(status_code=409, detail="Plugin is not connected")
    if row is None or not row.enabled:
        raise HTTPException(status_code=409, detail="Plugin is disabled")
    try:
        if plugin_id == "amocrm":
            return await _call_amocrm(http_client, secrets, body)
        if plugin_id == "bitrix24":
            return await _call_bitrix(http_client, secrets, body)
        return await _call_tilda(http_client, secrets, body)
    except HTTPException:
        raise
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail="Upstream unavailable") from exc


async def _call_amadeus(
    http_client: httpx.AsyncClient,
    settings: Settings,
    body: CallRequest,
) -> dict[str, Any]:
    url, params = amadeus_url(body.path.strip(), body.query, settings)
    token = await amadeus_access_token(http_client, settings)
    response = await http_client.get(
        url,
        params=params,
        headers={"Authorization": f"Bearer {token}"},
    )
    return _upstream_json(response, settings.amadeus_client_secret or "")


async def _call_amocrm(
    http_client: httpx.AsyncClient,
    secrets: dict[str, str],
    body: CallRequest,
) -> dict[str, Any]:
    path = body.path.strip().lstrip("/")
    if not AMO_PATH.fullmatch(path):
        raise HTTPException(status_code=400, detail="path is not allowed")
    url = f"https://{secrets['subdomain']}.amocrm.ru/api/v4/{path}"
    response = await http_client.request(
        body.method,
        url,
        params=body.query or None,
        json=body.body if body.method != "GET" else None,
        headers={"Authorization": f"Bearer {secrets['token']}"},
    )
    return _upstream_json(response, secrets["token"])


async def _call_bitrix(
    http_client: httpx.AsyncClient,
    secrets: dict[str, str],
    body: CallRequest,
) -> dict[str, Any]:
    method = body.path.strip().removesuffix(".json")
    if not re.fullmatch(r"crm\.(deal|contact|company|lead)\.(list|get|add|update)", method):
        raise HTTPException(status_code=400, detail="path is not allowed")
    url = f"{secrets['webhook_url']}{method}.json"
    response = await http_client.post(url, json=body.body if isinstance(body.body, dict) else {})
    return _upstream_json(response, secrets["webhook_url"])


async def _call_tilda(
    http_client: httpx.AsyncClient,
    secrets: dict[str, str],
    body: CallRequest,
) -> dict[str, Any]:
    method = body.path.strip()
    if method not in {"getprojectslist", "getprojectinfo", "getpageslist", "getpage"}:
        raise HTTPException(status_code=400, detail="path is not allowed")
    params = {
        "publickey": secrets["public_key"],
        "secretkey": secrets["secret_key"],
        **body.query,
    }
    response = await http_client.get(f"https://api.tildacdn.info/v1/{method}/", params=params)
    return _upstream_json(response, secrets["secret_key"])


def _upstream_json(response: httpx.Response, secret: str) -> dict[str, Any]:
    text = redact_secret(response.text, secret)
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=redact_secret("Upstream error", secret) if secret in response.text else "Upstream error")
    try:
        payload = json.loads(text) if text else {}
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="Upstream error") from exc
    if not isinstance(payload, dict):
        raise HTTPException(status_code=502, detail="Upstream error")
    return payload
