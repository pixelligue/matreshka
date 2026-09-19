"""Authenticated OpenAI-compatible chat completions proxy."""

from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterator, Callable
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from starlette.responses import StreamingResponse

from matreshka_api.auth import CurrentUserDep
from matreshka_api.db import SettingsDep
from matreshka_api.sse import data_frame
from matreshka_api.usage import (
    UsageObservation,
    llmtokenapi_charge,
    provider_request_id,
    record_usage,
    token_counts,
)

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
    observe: Callable[[str], None] | None = None,
) -> AsyncIterator[bytes]:
    buf = ""
    saw_done = False
    try:
        async for raw in response.aiter_bytes():
            buf += raw.decode("utf-8", errors="replace")
            while "\n\n" in buf:
                event, buf = buf.split("\n\n", 1)
                if observe is not None:
                    observe(event)
                framed = rewrite_sse_event(event, public_id)
                if "data: [DONE]" in framed:
                    saw_done = True
                yield (framed + "\n\n").encode("utf-8")
        if buf.strip():
            if observe is not None:
                observe(buf)
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
    tool_schema_bytes = len(json.dumps(tools, ensure_ascii=False).encode("utf-8")) if isinstance(tools, list) else 0
    request_bytes = len(json.dumps(payload, ensure_ascii=False).encode("utf-8"))
    user_id = _user.id
    assert user_id is not None
    engine = request.app.state.engine
    logger.warning(
        "proxy model=%s tools=%s keys=%s",
        model,
        len(tools) if isinstance(tools, list) else 0,
        sorted(payload.keys()),
    )
    headers = {"Authorization": f"Bearer {settings.llmtokenapi_api_key}"}
    try:
        upstream_request = http_client.build_request(
            "POST",
            url,
            json=payload,
            headers=headers,
        )
        request_bytes = len(upstream_request.content)
        response = await http_client.send(upstream_request, stream=True)
    except httpx.RequestError as exc:
        await record_usage(engine, user_id, UsageObservation(
            operation="chat", provider="llmtokenapi", model=model,
            status="transport_error", request_bytes=request_bytes,
            tool_schema_bytes=tool_schema_bytes,
            tool_count=len(tools) if isinstance(tools, list) else 0,
        ))
        raise HTTPException(
            status_code=502,
            detail=redact_secret("Upstream unavailable", settings.llmtokenapi_api_key),
        ) from exc

    if response.status_code >= 400:
        error_body = (await response.aread()).decode("utf-8", errors="replace")
        await response.aclose()
        await record_usage(engine, user_id, UsageObservation(
            operation="chat", provider="llmtokenapi", model=model,
            status="http_error", request_bytes=request_bytes,
            tool_schema_bytes=tool_schema_bytes,
            tool_count=len(tools) if isinstance(tools, list) else 0,
        ))
        raise HTTPException(
            status_code=502,
            detail=redact_secret(
                f"Upstream error ({response.status_code})",
                settings.llmtokenapi_api_key,
            )
            if settings.llmtokenapi_api_key in error_body
            else f"Upstream error ({response.status_code})",
        )

    observed: dict[str, object] = {}

    def observe(event: str) -> None:
        for line in event.splitlines():
            if not line.startswith("data:"):
                continue
            try:
                value = json.loads(line[5:].strip())
            except json.JSONDecodeError:
                continue
            if isinstance(value, dict):
                if "usage" in value:
                    observed["usage"] = value["usage"]
                    if "id" in value:
                        observed["id"] = value["id"]
                elif "id" in value and "id" not in observed:
                    observed["id"] = value["id"]

    async def metered_stream() -> AsyncIterator[bytes]:
        status = "interrupted"
        result_bytes = 0
        try:
            async for chunk in iter_upstream_sse(response, model, observe):
                result_bytes += len(chunk)
                yield chunk
            status = "completed"
        finally:
            await record_usage(engine, user_id, UsageObservation(
                operation="chat", provider="llmtokenapi", model=model,
                status=status, tokens=token_counts(observed),
                charge=llmtokenapi_charge(observed),
                request_bytes=request_bytes, tool_schema_bytes=tool_schema_bytes,
                tool_count=len(tools) if isinstance(tools, list) else 0,
                result_bytes=result_bytes,
                provider_request_id=provider_request_id(observed),
            ))

    return StreamingResponse(
        metered_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
