"""Authenticated OpenRouter image generate/edit proxy with Jev model pick."""

from __future__ import annotations

import json
import logging
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from matreshka_api.auth import CurrentUserDep
from matreshka_api.chat import HttpClientDep, redact_secret
from matreshka_api.db import SettingsDep
from matreshka_api.openrouter import (
    JEV_MODEL,
    OPENROUTER_DECISIONS_URL,
    SELECT_MAX_BYTES,
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

router = APIRouter(prefix="/v1/images", tags=["images"])
logger = logging.getLogger("matreshka.images")

OPENROUTER_IMAGES_URL = "https://openrouter.ai/api/v1/images"
DEFAULT_MODEL = "gpt-image-2"
IMAGE_SLUGS: dict[str, str] = {
    "gpt-image-2": "openai/gpt-image-2",
    "qwen-image-3": "qwen/qwen-image-3",
    "grok-imagine-image-2.0": "x-ai/grok-imagine-image-2.0",
}
N_MAX: dict[str, int] = {
    "gpt-image-2": 10,
    "qwen-image-3": 6,
    "grok-imagine-image-2.0": 1,
}
REF_MAX: dict[str, int] = {
    "gpt-image-2": 16,
    "qwen-image-3": 4,
    "grok-imagine-image-2.0": 3,
}
ImageModelId = Literal["gpt-image-2", "qwen-image-3", "grok-imagine-image-2.0"]
JEV_CRITERIA = {
    "gpt-image-2": "Cheap default. Best for batches (n>1), many reference images, Latin or Cyrillic text on the picture.",
    "qwen-image-3": "Chinese text, a repeatable style, or up to six images in one call.",
    "grok-imagine-image-2.0": "A single cinematic or photoreal shot with at most three references. Never for batches.",
}


class ImageReference(BaseModel):
    model_config = ConfigDict(extra="ignore")

    b64: str = ""
    mediaType: str = "image/png"


class GenerateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    prompt: str = ""
    n: int = Field(default=1, ge=1, le=10)
    model: ImageModelId | None = None
    aspectRatio: str | None = None
    references: list[ImageReference] = Field(default_factory=list)


class GeneratedImage(BaseModel):
    b64: str
    mediaType: str


class GenerateResponse(BaseModel):
    model: str
    images: list[GeneratedImage]


def _media_type(value: object) -> str:
    if isinstance(value, str) and value.startswith("image/"):
        return value
    return "image/png"


def _data_url(ref: ImageReference) -> str:
    raw = ref.b64.strip()
    if raw.startswith("data:"):
        return raw
    return f"data:{_media_type(ref.mediaType)};base64,{raw}"


async def pick_image_model(
    http_client: httpx.AsyncClient,
    key: str,
    prompt: str,
    n: int,
    ref_count: int,
) -> str:
    names = ["gpt-image-2", "qwen-image-3"]
    if n <= 1 and ref_count <= 3:
        names.append("grok-imagine-image-2.0")
    goal = (
        f"Image task:\n{prompt[:2000]}\n\nn={n}\nreferences={ref_count}\n"
        "Pick the single best image model."
    )
    reject_over_cap(utf8_size(goal, *names), SELECT_MAX_BYTES)
    outbound = {
        "model": JEV_MODEL,
        "state": goal,
        "questions": {
            "tool": {
                "type": "choice",
                "instructions": "Pick the single best image model for this task.",
                "criteria": {name: JEV_CRITERIA[name] for name in names},
            },
        },
    }
    try:
        response = await http_client.post(
            OPENROUTER_DECISIONS_URL,
            json=outbound,
            headers=openrouter_headers(key),
        )
    except httpx.RequestError:
        return DEFAULT_MODEL
    if response.status_code >= 400:
        return DEFAULT_MODEL
    try:
        payload = response.json()
    except ValueError:
        return DEFAULT_MODEL
    if not isinstance(payload, dict):
        return DEFAULT_MODEL
    answers = payload.get("answers")
    if not isinstance(answers, dict):
        return DEFAULT_MODEL
    answer = answers.get("tool")
    if not isinstance(answer, dict):
        return DEFAULT_MODEL
    choice = answer.get("choice")
    if isinstance(choice, str) and choice in names:
        return choice
    return DEFAULT_MODEL


@router.post("/generate")
async def generate_images(
    _user: CurrentUserDep,
    body: GenerateRequest,
    settings: SettingsDep,
    http_client: HttpClientDep,
    request: Request,
) -> GenerateResponse:
    prompt = body.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt must not be empty")
    key = openrouter_key(settings)
    refs = [item for item in body.references if item.b64.strip()]
    model_id = body.model
    if model_id is None:
        model_id = await pick_image_model(http_client, key, prompt, body.n, len(refs))
    if model_id not in IMAGE_SLUGS:
        raise HTTPException(status_code=400, detail="unknown image model")
    n = min(body.n, N_MAX[model_id])
    if len(refs) > REF_MAX[model_id]:
        raise HTTPException(status_code=400, detail="too many reference images")
    slug = IMAGE_SLUGS[model_id]
    outbound: dict[str, object] = {
        "model": slug,
        "prompt": prompt,
        "n": n,
    }
    if model_id == "gpt-image-2":
        outbound["quality"] = "low"
    if body.aspectRatio:
        outbound["aspect_ratio"] = body.aspectRatio
    if refs:
        outbound["input_references"] = [_data_url(item) for item in refs]
    payload: object = None
    response: httpx.Response | None = None
    images: list[GeneratedImage] = []
    status = "transport_error"
    user_id = _user.id
    assert user_id is not None
    try:
        try:
            response = await http_client.post(
                OPENROUTER_IMAGES_URL,
                json=outbound,
                headers=openrouter_headers(key),
            )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=502,
                detail=redact_secret("Upstream unavailable", key),
            ) from exc
        status = "http_error"
        if response.status_code >= 400:
            logger.warning("images upstream status=%s model=%s", response.status_code, slug)
            raise upstream_http_error(key, response.text)
        status = "invalid_response"
        try:
            payload = response.json()
        except ValueError as exc:
            raise HTTPException(status_code=502, detail="Upstream error") from exc
        if not isinstance(payload, dict):
            raise HTTPException(status_code=502, detail="Upstream error")
        data = payload.get("data")
        if not isinstance(data, list) or not data:
            raise HTTPException(status_code=502, detail="Upstream error")
        for item in data:
            if not isinstance(item, dict):
                continue
            b64 = item.get("b64_json")
            if not isinstance(b64, str) or not b64.strip():
                continue
            images.append(GeneratedImage(b64=b64, mediaType=_media_type(item.get("media_type"))))
        if not images:
            raise HTTPException(status_code=502, detail="Upstream error")
        logger.warning("images model=%s count=%s", slug, len(images))
        status = "completed"
        return GenerateResponse(model=model_id, images=images)
    finally:
        counts = token_counts(payload)
        estimate = (
            estimate_usd(slug, counts.input_tokens, counts.output_tokens)
            if counts.input_tokens is not None and counts.output_tokens is not None else None
        )
        await record_usage(request.app.state.engine, user_id, UsageObservation(
            operation="images",
            provider="openrouter",
            model=slug,
            status=status,
            tokens=counts,
            charge=openrouter_charge(payload, estimate),
            request_bytes=len(json.dumps(outbound, ensure_ascii=False).encode("utf-8")),
            result_bytes=len(response.content) if response is not None else None,
            result_count=len(images) if status == "completed" else None,
            provider_request_id=provider_request_id(payload),
        ), request.app.state.usage_analytics)
