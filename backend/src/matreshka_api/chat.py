"""Authenticated OpenAI-compatible chat completions proxy."""

from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterator
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from starlette.responses import StreamingResponse

from matreshka_api.auth import CurrentUserDep
from matreshka_api.db import SettingsDep
from matreshka_api.sse import data_frame

# Public ids the desktop may send. Upstream vendor ids never leave this process.
PUBLIC_TO_UPSTREAM = {
    "matrena": "deepseek-ai-deepseek-v4-flash-0731",
}

router = APIRouter(prefix="/v1/chat", tags=["chat"])
logger = logging.getLogger("matreshka.chat")


def get_http_client(request: Request) -> httpx.AsyncClient:
    return request.app.state.http_client


HttpClientDep = Annotated[httpx.AsyncClient, Depends(get_http_client)]


def redact_secret(text: str, secret: str) -> str:
    if not secret:
        return text
    return text.replace(secret, "[redacted]")


def rewrite_public_payload(payload: str, public_id: str) -> str:
    if payload == "[DONE]":
        return payload
    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        rewritten = payload
        for upstream_id in PUBLIC_TO_UPSTREAM.values():
            rewritten = rewritten.replace(upstream_id, public_id)
        return rewritten
    if isinstance(data, dict) and "model" in data:
        data["model"] = public_id
    dumped = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    for upstream_id in PUBLIC_TO_UPSTREAM.values():
        dumped = dumped.replace(upstream_id, public_id)
    return dumped


def rewrite_sse_event(event: str, public_id: str) -> str:
    lines: list[str] = []
    for line in event.split("\n"):
        if line.startswith("data:"):
            payload = line[5:]
            if payload.startswith(" "):
                payload = payload[1:]
            lines.append("data: " + rewrite_public_payload(payload, public_id))
        else:
            lines.append(line)
    return "\n".join(lines)


async def iter_upstream_sse(
    response: httpx.Response,
    public_id: str,
) -> AsyncIterator[bytes]:
    buf = ""
    saw_done = False
    try:
        async for raw in response.aiter_bytes():
            buf += raw.decode("utf-8", errors="replace")
            while "\n\n" in buf:
                event, buf = buf.split("\n\n", 1)
                framed = rewrite_sse_event(event, public_id)
                if "data: [DONE]" in framed:
                    saw_done = True
                yield (framed + "\n\n").encode("utf-8")
        if buf.strip():
            framed = rewrite_sse_event(buf, public_id)
            if "data: [DONE]" in framed:
                saw_done = True
            yield (framed + "\n\n").encode("utf-8")
        if not saw_done:
            yield data_frame("[DONE]").encode("utf-8")
    finally:
        await response.aclose()


@router.post("/completions")
async def create_chat_completion(
    _user: CurrentUserDep,
    request: Request,
    settings: SettingsDep,
    http_client: HttpClientDep,
) -> StreamingResponse:
    try:
        body = await request.json()
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON") from exc
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Invalid JSON")
    if body.get("stream") is False:
        raise HTTPException(
            status_code=400,
            detail="Non-stream completions are not supported",
        )
    model = body.get("model")
    if not isinstance(model, str):
        raise HTTPException(status_code=400, detail="Unknown model")
    upstream_model = PUBLIC_TO_UPSTREAM.get(model)
    if upstream_model is None:
        raise HTTPException(status_code=400, detail="Unknown model")

    url = settings.llm_upstream_base_url.rstrip("/") + "/chat/completions"
    payload = dict(body)
    payload["model"] = upstream_model
    payload["stream"] = True
    tools = payload.get("tools")
    logger.warning(
        "proxy model=%s tools=%s keys=%s",
        model,
        len(tools) if isinstance(tools, list) else 0,
        sorted(payload.keys()),
    )
    headers = {"Authorization": f"Bearer {settings.llmtokenapi_api_key}"}
    try:
        request = http_client.build_request(
            "POST",
            url,
            json=payload,
            headers=headers,
        )
        response = await http_client.send(request, stream=True)
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail=redact_secret("Upstream unavailable", settings.llmtokenapi_api_key),
        ) from exc

    if response.status_code >= 400:
        error_body = (await response.aread()).decode("utf-8", errors="replace")
        await response.aclose()
        raise HTTPException(
            status_code=502,
            detail=redact_secret(
                f"Upstream error ({response.status_code})",
                settings.llmtokenapi_api_key,
            )
            if settings.llmtokenapi_api_key in error_body
            else f"Upstream error ({response.status_code})",
        )

    return StreamingResponse(
        iter_upstream_sse(response, model),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
