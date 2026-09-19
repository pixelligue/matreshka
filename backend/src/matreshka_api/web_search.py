"""Authenticated web-search proxy: Keenable public and LLMTOKENAPI search."""

from __future__ import annotations

import json
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from matreshka_api.auth import CurrentUserDep
from matreshka_api.chat import HttpClientDep, redact_secret
from matreshka_api.db import SettingsDep
from matreshka_api.usage import UsageObservation, llmtokenapi_charge, record_usage, token_counts

KEENABLE_PUBLIC_SEARCH = "https://api.keenable.ai/v1/search/public"
KEENABLE_TITLE = "Matreshka"
ALLOWED_PROVIDERS = frozenset({"keenable", "llmtokenapi"})

router = APIRouter(prefix="/v1/web", tags=["web"])


class WebSearchRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    query: str
    provider: str | None = None
    maxResults: int | None = Field(default=None, gt=0)


class WebSearchSource(BaseModel):
    url: str
    title: str | None = None
    snippet: str | None = None
    publishedAt: str | None = None


class WebSearchResponse(BaseModel):
    sources: list[WebSearchSource]


def _source_from_item(item: dict[str, Any]) -> WebSearchSource | None:
    url = item.get("url") or item.get("link")
    if not isinstance(url, str) or not url:
        return None
    title = item.get("title") or item.get("name")
    snippet = item.get("snippet") or item.get("description") or item.get("text") or item.get("content")
    published = item.get("publishedAt") or item.get("published_at") or item.get("published_date")
    return WebSearchSource(
        url=url,
        title=title if isinstance(title, str) and title else None,
        snippet=snippet if isinstance(snippet, str) and snippet else None,
        publishedAt=published if isinstance(published, str) and published else None,
    )


def sources_from_payload(payload: object, limit: int | None) -> list[WebSearchSource]:
    if not isinstance(payload, dict):
        return []
    raw = (
        payload.get("results")
        or payload.get("items")
        or payload.get("sources")
        or payload.get("data")
        or []
    )
    if not isinstance(raw, list):
        return []
    sources: list[WebSearchSource] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        source = _source_from_item(item)
        if source is not None:
            sources.append(source)
        if limit is not None and len(sources) >= limit:
            break
    return sources


@router.post("/search")
async def web_search(
    _user: CurrentUserDep,
    body: WebSearchRequest,
    settings: SettingsDep,
    http_client: HttpClientDep,
    request: Request,
) -> WebSearchResponse:
    provider = body.provider or "keenable"
    if provider not in ALLOWED_PROVIDERS:
        raise HTTPException(status_code=400, detail="Unknown search provider")
    if not body.query.strip():
        raise HTTPException(status_code=400, detail="query must not be empty")
    key = settings.llmtokenapi_api_key
    upstream_body: dict[str, Any] = {"query": body.query}
    if provider == "keenable":
        if body.maxResults is not None:
            upstream_body["max_results"] = body.maxResults
    else:
        upstream_body["mode"] = "balanced"
        if body.maxResults is not None:
            upstream_body["limit"] = body.maxResults
    response: httpx.Response | None = None
    parsed: object = None
    sources: list[WebSearchSource] = []
    status = "transport_error"
    user_id = _user.id
    assert user_id is not None
    try:
        try:
            if provider == "keenable":
                response = await http_client.post(
                    KEENABLE_PUBLIC_SEARCH,
                    json=upstream_body,
                    headers={
                        "Content-Type": "application/json",
                        "X-Keenable-Title": KEENABLE_TITLE,
                    },
                )
            else:
                url = settings.llm_upstream_base_url.rstrip("/") + "/search"
                response = await http_client.post(
                    url,
                    json=upstream_body,
                    headers={
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json",
                    },
                )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=502,
                detail=redact_secret("Upstream unavailable", key),
            ) from exc
        status = "http_error"
        if response.status_code >= 400:
            error_body = response.text
            raise HTTPException(
                status_code=502,
                detail=redact_secret("Upstream error", key)
                if key in error_body
                else "Upstream error",
            )
        status = "invalid_response"
        try:
            parsed = response.json()
        except ValueError as exc:
            raise HTTPException(status_code=502, detail="Upstream error") from exc
        sources = sources_from_payload(parsed, body.maxResults)
        status = "completed"
        return WebSearchResponse(sources=sources)
    finally:
        await record_usage(request.app.state.engine, user_id, UsageObservation(
            operation="web_search", provider=provider, status=status,
            tokens=token_counts(parsed),
            charge=llmtokenapi_charge(parsed) if provider == "llmtokenapi" else None,
            request_bytes=len(json.dumps(upstream_body, ensure_ascii=False).encode("utf-8")),
            result_bytes=len(response.content) if response is not None else None,
            result_count=len(sources) if status == "completed" else None,
        ))
