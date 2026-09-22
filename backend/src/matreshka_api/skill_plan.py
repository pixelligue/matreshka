"""Jev picks a development skill; Flash writes the conceptual plan."""

from __future__ import annotations

import json
import logging

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from matreshka_api.auth import CurrentUserDep
from matreshka_api.chat import HttpClientDep, redact_secret
from matreshka_api.db import SettingsDep
from matreshka_api.openrouter import (
    JEV_MODEL,
    OPENROUTER_DECISIONS_URL,
    estimate_usd,
    openrouter_headers,
    openrouter_key,
    reject_over_cap,
    utf8_size,
    upstream_http_error,
)
from matreshka_api.skill_registry import (
    NONE_SKILL,
    REGISTRY,
    jev_skill_criteria,
    skills_for_choice,
)
from matreshka_api.usage import (
    UsageObservation,
    openrouter_charge,
    provider_request_id,
    record_usage,
    token_counts,
)

router = APIRouter(prefix="/v1/skills", tags=["skills"])
logger = logging.getLogger("matreshka.skill_plan")

PLAN_MAX_BYTES = 16_000


class SkillRef(BaseModel):
    id: str
    name: str
    body: str


class SkillSummary(BaseModel):
    id: str
    name: str
    summary: str


class PlanRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    request: str
    files: str = ""


class PlanResponse(BaseModel):
    skills: list[SkillRef] = Field(default_factory=list)


def registry_summaries() -> list[SkillSummary]:
    return [
        SkillSummary(id=skill.id, name=skill.id, summary=skill.summary)
        for skill in REGISTRY
    ]


@router.get("")
async def list_skills(_user: CurrentUserDep) -> list[SkillSummary]:
    """List the internal registry without skill bodies."""
    return registry_summaries()


@router.post("/plan")
async def plan_task(
    user: CurrentUserDep,
    body: PlanRequest,
    settings: SettingsDep,
    http_client: HttpClientDep,
    request: Request,
) -> PlanResponse:
    request_text = body.request.strip()
    if request_text == "":
        raise HTTPException(status_code=400, detail="request must not be empty")
    reject_over_cap(utf8_size(request_text, body.files), PLAN_MAX_BYTES)
    key = openrouter_key(settings)
    names = [NONE_SKILL, *[skill.id for skill in REGISTRY]]
    decision_payload = {
        "model": JEV_MODEL,
        "state": request_text,
        "questions": {
            "tool": {
                "type": "choice",
                "instructions": "Pick the skill that should shape the plan, or none.",
                "criteria": jev_skill_criteria(),
            },
        },
    }
    user_id = user.id
    assert user_id is not None
    choice = await _jev_choice(http_client, request, key, user_id, names, decision_payload)
    selected = skills_for_choice(choice)
    return PlanResponse(skills=[
        SkillRef(id=skill.id, name=skill.id, body=skill.body) for skill in selected
    ])


async def _jev_choice(
    http_client: httpx.AsyncClient,
    request: Request,
    key: str,
    user_id: int,
    names: list[str],
    outbound_payload: dict[str, object],
) -> str:
    payload: object = None
    response: httpx.Response | None = None
    status = "transport_error"
    try:
        try:
            response = await http_client.post(
                OPENROUTER_DECISIONS_URL,
                json=outbound_payload,
                headers=openrouter_headers(key),
            )
        except httpx.RequestError as exc:
            raise HTTPException(status_code=502, detail=redact_secret("Upstream unavailable", key)) from exc
        status = "http_error"
        if response.status_code >= 400:
            raise upstream_http_error(key, response.text)
        status = "invalid_response"
        try:
            payload = response.json()
        except ValueError as exc:
            raise HTTPException(status_code=502, detail="Upstream error") from exc
        if not isinstance(payload, dict):
            raise HTTPException(status_code=502, detail="Upstream error")
        answers = payload.get("answers")
        answer = answers.get("tool") if isinstance(answers, dict) else None
        choice = answer.get("choice") if isinstance(answer, dict) else None
        if not isinstance(choice, str) or choice not in names:
            raise HTTPException(status_code=502, detail="Upstream error")
        status = "completed"
        return choice
    finally:
        counts = token_counts(payload)
        estimate = (
            estimate_usd(JEV_MODEL, counts.input_tokens, counts.output_tokens)
            if counts.input_tokens is not None and counts.output_tokens is not None else None
        )
        await record_usage(request.app.state.engine, user_id, UsageObservation(
            operation="skill_plan", provider="openrouter", model=JEV_MODEL,
            status=status, tokens=counts, charge=openrouter_charge(payload, estimate),
            request_bytes=len(json.dumps(outbound_payload, ensure_ascii=False).encode("utf-8")),
            result_bytes=len(response.content) if response is not None else None,
            provider_request_id=provider_request_id(payload),
        ), request.app.state.usage_analytics)
