"""Authenticated DeepSeek V4.1 Flash consult via OpenRouter."""

from __future__ import annotations

import json
import logging
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from matreshka_api.auth import CurrentUserDep
from matreshka_api.chat import HttpClientDep, redact_secret
from matreshka_api.db import SettingsDep
from matreshka_api.openrouter import (
    CONSULT_MAX_BYTES,
    FLASH_MODEL,
    OPENROUTER_CHAT_URL,
    openrouter_headers,
    openrouter_key,
    reject_over_cap,
    usage_from_payload,
    utf8_size,
    upstream_http_error,
)

router = APIRouter(prefix="/v1", tags=["consult"])
logger = logging.getLogger("matreshka.consult")

Verdict = Literal["ok", "revise", "risk"]
VERDICTS = frozenset({"ok", "revise", "risk"})

CONSULT_SYSTEM = (
    "You are a cheap coding consultant. Reply with JSON only: "
    '{"verdict":"ok"|"revise"|"risk","detail":"<one short sentence>"}. '
    "ok means proceed. revise means change the plan or code. "
    "risk means the step is dangerous or likely wrong."
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
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return ConsultResponse(verdict="risk", detail=text[:2000])
    if not isinstance(data, dict):
        return ConsultResponse(verdict="risk", detail=text[:2000])
    verdict = data.get("verdict")
    detail = data.get("detail")
    if verdict not in VERDICTS:
        return ConsultResponse(verdict="risk", detail=text[:2000])
    return ConsultResponse(
        verdict=verdict,  # type: ignore[arg-type]
        detail="" if detail is None else str(detail)[:2000],
    )


@router.post("/consult")
async def consult(
    _user: CurrentUserDep,
    body: ConsultRequest,
    settings: SettingsDep,
    http_client: HttpClientDep,
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
    try:
        response = await http_client.post(
            OPENROUTER_CHAT_URL,
            json={
                "model": FLASH_MODEL,
                "stream": False,
                "max_tokens": 256,
                "messages": [
                    {"role": "system", "content": CONSULT_SYSTEM},
                    {"role": "user", "content": user_text},
                ],
            },
            headers=openrouter_headers(key),
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail=redact_secret("Upstream unavailable", key),
        ) from exc
    if response.status_code >= 400:
        raise upstream_http_error(key, response.text)
    try:
        payload: object = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="Upstream error") from exc
    if not isinstance(payload, dict):
        raise HTTPException(status_code=502, detail="Upstream error")
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        raise HTTPException(status_code=502, detail="Upstream error")
    message = choices[0].get("message") if isinstance(choices[0], dict) else None
    content = message.get("content") if isinstance(message, dict) else None
    if not isinstance(content, str) or not content.strip():
        raise HTTPException(status_code=502, detail="Upstream error")
    logger.warning("consult model=%s", FLASH_MODEL)
    parsed = parse_verdict(content)
    usage = usage_from_payload(FLASH_MODEL, payload)
    if usage is not None:
        parsed = parsed.model_copy(update={"usage": ConsultUsage.model_validate(usage)})
    return parsed
