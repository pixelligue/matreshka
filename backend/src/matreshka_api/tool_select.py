"""Authenticated Jev tool-name choice via OpenRouter Decisions."""

from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from matreshka_api.auth import CurrentUserDep
from matreshka_api.chat import HttpClientDep, redact_secret
from matreshka_api.db import SettingsDep
from matreshka_api.openrouter import (
    JEV_MODEL,
    OPENROUTER_DECISIONS_URL,
    SELECT_MAX_BYTES,
    openrouter_headers,
    openrouter_key,
    reject_over_cap,
    usage_from_payload,
    utf8_size,
    upstream_http_error,
)

router = APIRouter(prefix="/v1/tools", tags=["consult"])
logger = logging.getLogger("matreshka.tool_select")


class ToolSelectRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    goal: str
    candidates: list[str]


class ToolSelectUsage(BaseModel):
    input_tokens: int
    output_tokens: int
    usd: float


class ToolSelectResponse(BaseModel):
    tool: str
    confidence: float = Field(ge=0, le=1)
    usage: ToolSelectUsage | None = None


def _criteria(candidates: list[str]) -> dict[str, str]:
    return {name: f"Use the {name} tool" for name in candidates}


@router.post("/select")
async def select_tool(
    _user: CurrentUserDep,
    body: ToolSelectRequest,
    settings: SettingsDep,
    http_client: HttpClientDep,
) -> ToolSelectResponse:
    names = [name.strip() for name in body.candidates if name.strip()]
    if not names:
        raise HTTPException(status_code=400, detail="candidates must not be empty")
    if not body.goal.strip():
        raise HTTPException(status_code=400, detail="goal must not be empty")
    reject_over_cap(utf8_size(body.goal, *names), SELECT_MAX_BYTES)
    key = openrouter_key(settings)
    try:
        response = await http_client.post(
            OPENROUTER_DECISIONS_URL,
            json={
                "model": JEV_MODEL,
                "state": body.goal,
                "questions": {
                    "tool": {
                        "type": "choice",
                        "instructions": "Pick the single best tool for this goal.",
                        "criteria": _criteria(names),
                    },
                },
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
    answers = payload.get("answers")
    if not isinstance(answers, dict):
        raise HTTPException(status_code=502, detail="Upstream error")
    answer = answers.get("tool")
    if not isinstance(answer, dict):
        raise HTTPException(status_code=502, detail="Upstream error")
    choice = answer.get("choice")
    if not isinstance(choice, str) or choice not in names:
        raise HTTPException(status_code=502, detail="Upstream error")
    confidence = answer.get("confidence")
    if not isinstance(confidence, (int, float)):
        confidence = 0.0
    bounded = max(0.0, min(1.0, float(confidence)))
    logger.warning("select model=%s tool=%s", JEV_MODEL, choice)
    usage = usage_from_payload(JEV_MODEL, payload)
    return ToolSelectResponse(
        tool=choice,
        confidence=bounded,
        usage=ToolSelectUsage.model_validate(usage) if usage is not None else None,
    )
