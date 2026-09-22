"""Authenticated DeepSeek V4.1 Flash consult via OpenRouter."""

from __future__ import annotations

import json
import logging
import re
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from matreshka_api.auth import CurrentUserDep
from matreshka_api.chat import HttpClientDep, redact_secret
from matreshka_api.db import SettingsDep
from matreshka_api.openrouter import (
    CONSULT_MAX_BYTES,
    FLASH_MODEL,
    OPENROUTER_CHAT_URL,
    estimate_usd,
    openrouter_headers,
    openrouter_key,
    reject_over_cap,
    usage_from_payload,
    utf8_size,
    upstream_http_error,
)
from matreshka_api.usage import (
    UsageObservation,
    openrouter_charge,
    provider_request_id,
    record_usage,
    token_counts,
)

router = APIRouter(prefix="/v1", tags=["consult"])
logger = logging.getLogger("matreshka.consult")

Verdict = Literal["ok", "revise", "risk"]
VERDICTS = frozenset({"ok", "revise", "risk"})
_VERDICT_RE = re.compile(r'verdict\\*"\s*:\s*\\*"?(ok|revise|risk)')
_DETAIL_RE = re.compile(r'detail\\*"\s*:\s*\\*"?(.*?)(?:\\*"|$)', re.DOTALL)

CONSULT_SYSTEM = (
    "You advise an office assistant. Reply with JSON only, no markdown: "
    '{"verdict":"ok"|"revise"|"risk","detail":"<one short sentence>"}. '
    "ok means proceed. revise means change the approach. "
    "risk means the step is dangerous, dishonest, or likely wrong. "
    "Do not nest JSON inside detail."
)


class ConsultRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    goal: str
    question: str
    plan: str = ""
    evidence: str = ""


class ConsultUsage(BaseModel):
    input_tokens: int
    output_tokens: int
    usd: float


class ConsultResponse(BaseModel):
    verdict: Verdict
    detail: str = Field(default="")
    usage: ConsultUsage | None = None


def parse_verdict(text: str) -> ConsultResponse:
    data = _json_object(text)
    if isinstance(data, dict):
        detail = data.get("detail")
        if isinstance(detail, str):
            nested = _json_object(detail)
            if isinstance(nested, dict) and nested.get("verdict") in VERDICTS:
                data = nested
                detail = data.get("detail")
            elif detail.lstrip().startswith("{") or "verdict" in detail:
                scraped = _scrape_verdict(detail) or _scrape_verdict(text)
                if scraped is not None:
                    return scraped
        verdict = data.get("verdict")
        if verdict in VERDICTS:
            return ConsultResponse(
                verdict=verdict,  # type: ignore[arg-type]
                detail="" if detail is None else str(detail)[:2000],
            )
    scraped = _scrape_verdict(text)
    if scraped is not None:
        return scraped
    return ConsultResponse(verdict="risk", detail=text[:2000])


def _scrape_verdict(text: str) -> ConsultResponse | None:
    matches = list(_VERDICT_RE.finditer(text))
    if not matches:
        return None
    last = matches[-1]
    verdict = last.group(1)
    detail = ""
    detail_match = _DETAIL_RE.search(text[last.start() :])
    if detail_match is not None:
        detail = detail_match.group(1).replace('\\"', '"').replace('\\n', ' ').strip()[:2000]
    return ConsultResponse(verdict=verdict, detail=detail)  # type: ignore[arg-type]


def _json_object(text: str) -> object | None:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        if stripped.startswith("json"):
            stripped = stripped[4:]
        stripped = stripped.strip()
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        start = stripped.find("{")
        end = stripped.rfind("}")
        if start < 0 or end <= start:
            return None
        try:
            return json.loads(stripped[start : end + 1])
        except json.JSONDecodeError:
            return None


def choice_text(choice: object) -> str | None:
    if not isinstance(choice, dict):
        return None
    message = choice.get("message")
    if isinstance(message, dict):
        for key in ("content", "reasoning", "reasoning_content"):
            text = message_text(message.get(key))
            if text is not None:
                return text
    return message_text(choice.get("text"))


def message_text(content: object) -> str | None:
    if isinstance(content, str) and content.strip():
        return content
    if not isinstance(content, list):
        return None
    parts: list[str] = []
    for item in content:
        if isinstance(item, str) and item.strip():
            parts.append(item)
            continue
        if isinstance(item, dict):
            text = item.get("text")
            if isinstance(text, str) and text.strip():
                parts.append(text)
    joined = "".join(parts).strip()
    return joined or None


@router.post("/consult")
async def consult(
    _user: CurrentUserDep,
    body: ConsultRequest,
    settings: SettingsDep,
    http_client: HttpClientDep,
    request: Request,
) -> ConsultResponse:
    if not body.goal.strip() or not body.question.strip():
        raise HTTPException(status_code=400, detail="goal and question must not be empty")
    reject_over_cap(
        utf8_size(body.goal, body.question, body.plan, body.evidence),
        CONSULT_MAX_BYTES,
    )
    key = openrouter_key(settings)
    user_text = (
        f"Goal:\n{body.goal}\n\nQuestion:\n{body.question}\n\n"
        f"Plan:\n{body.plan}\n\nEvidence:\n{body.evidence}"
    )
    outbound_payload = {
        "model": FLASH_MODEL,
        "stream": False,
        "max_tokens": 512,
        "messages": [
            {"role": "system", "content": CONSULT_SYSTEM},
            {"role": "user", "content": user_text},
        ],
    }
    payload: object = None
    response: httpx.Response | None = None
    status = "transport_error"
    user_id = _user.id
    assert user_id is not None
    try:
        try:
            response = await http_client.post(
                OPENROUTER_CHAT_URL,
                json=outbound_payload,
                headers=openrouter_headers(key),
            )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=502,
                detail=redact_secret("Upstream unavailable", key),
            ) from exc
        status = "http_error"
        if response.status_code >= 400:
            logger.warning("consult upstream status=%s", response.status_code)
            raise upstream_http_error(key, response.text)
        status = "invalid_response"
        try:
            payload = response.json()
        except ValueError as exc:
            raise HTTPException(status_code=502, detail="Upstream error") from exc
        if not isinstance(payload, dict):
            raise HTTPException(status_code=502, detail="Upstream error")
        choices = payload.get("choices")
        if not isinstance(choices, list) or not choices:
            raise HTTPException(status_code=502, detail="Upstream error")
        text = choice_text(choices[0])
        if text is None:
            logger.warning("consult model=%s empty content status=%s", FLASH_MODEL, response.status_code)
            raise HTTPException(status_code=502, detail="Upstream error")
        logger.warning("consult model=%s", FLASH_MODEL)
        parsed = parse_verdict(text)
        usage = usage_from_payload(FLASH_MODEL, payload)
        if usage is not None:
            parsed = parsed.model_copy(update={"usage": ConsultUsage.model_validate(usage)})
        status = "completed"
        return parsed
    finally:
        counts = token_counts(payload)
        estimate = (
            estimate_usd(FLASH_MODEL, counts.input_tokens, counts.output_tokens)
            if counts.input_tokens is not None and counts.output_tokens is not None else None
        )
        await record_usage(request.app.state.engine, user_id, UsageObservation(
            operation="consult", provider="openrouter", model=FLASH_MODEL,
            status=status, tokens=counts, charge=openrouter_charge(payload, estimate),
            request_bytes=len(json.dumps(outbound_payload, ensure_ascii=False).encode("utf-8")),
            result_bytes=len(response.content) if response is not None else None,
            provider_request_id=provider_request_id(payload),
        ), request.app.state.usage_analytics)
