"""Authenticated OpenRouter speech-to-text proxy. Deepgram Nova-3 is the default."""

from __future__ import annotations

import base64
import binascii
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
    openrouter_headers,
    openrouter_key,
    upstream_http_error,
)
from matreshka_api.usage import (
    UsageObservation,
    openrouter_charge,
    provider_request_id,
    record_usage,
    token_counts,
)

router = APIRouter(prefix="/v1/audio", tags=["audio"])
logger = logging.getLogger("matreshka.transcription")

OPENROUTER_TRANSCRIPTIONS_URL = "https://openrouter.ai/api/v1/audio/transcriptions"
TRANSCRIBE_MODEL = "deepgram/nova-3"
# Nova-3 list price on OpenRouter, used only when the response omits usage.cost.
NOVA3_USD_PER_SECOND = 0.0043 / 60
MAX_AUDIO_BYTES = 25 * 1024 * 1024
AudioFormat = Literal["mp3", "wav", "ogg", "m4a", "aac", "webm"]


class TranscribeRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    data: str = ""
    format: AudioFormat
    language: str | None = Field(default=None, max_length=8)


class TranscribeResponse(BaseModel):
    text: str
    model: str
    seconds: float | None = None


def decode_audio(data: str) -> bytes:
    """Decode canonical base64 audio and refuse empty or oversized payloads."""
    raw = data.strip()
    if raw.startswith("data:"):
        raw = raw.split(",", 1)[-1]
    try:
        decoded = base64.b64decode(raw, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Audio data must be canonical base64") from exc
    if len(decoded) == 0:
        raise HTTPException(status_code=400, detail="Audio data is empty")
    if len(decoded) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=400, detail="Audio exceeds 25 MiB")
    return decoded


def _seconds(payload: object) -> float | None:
    if not isinstance(payload, dict):
        return None
    usage = payload.get("usage")
    if not isinstance(usage, dict):
        return None
    value = usage.get("seconds")
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    if value < 0:
        return None
    return float(value)


def _estimate(seconds: float | None) -> float | None:
    if seconds is None:
        return None
    return seconds * NOVA3_USD_PER_SECOND


@router.post("/transcriptions")
async def transcribe(
    body: TranscribeRequest,
    user_id: CurrentUserDep,
    settings: SettingsDep,
    http_client: HttpClientDep,
    request: Request,
) -> TranscribeResponse:
    """Transcribe one recording with Deepgram Nova-3. The OpenRouter key stays on the API."""
    key = openrouter_key(settings)
    audio = decode_audio(body.data)
    language = body.language.strip() if body.language is not None else ""
    if language != "" and (len(language) < 2 or not language.isalpha()):
        raise HTTPException(status_code=400, detail="language must be an ISO-639-1 code")
    outbound: dict[str, object] = {
        "model": TRANSCRIBE_MODEL,
        "input_audio": {
            "data": base64.b64encode(audio).decode("ascii"),
            "format": body.format,
        },
    }
    if language != "":
        outbound["language"] = language.lower()
    payload: object = None
    response: httpx.Response | None = None
    status = "unavailable"
    try:
        try:
            response = await http_client.post(
                OPENROUTER_TRANSCRIPTIONS_URL,
                json=outbound,
                headers=openrouter_headers(key),
            )
        except httpx.RequestError as exc:
            raise HTTPException(status_code=502, detail=redact_secret("Upstream unavailable", key)) from exc
        status = "http_error"
        if response.status_code >= 400:
            logger.warning("transcription upstream status=%s", response.status_code)
            raise upstream_http_error(key, response.text)
        status = "invalid_response"
        try:
            payload = response.json()
        except ValueError as exc:
            raise HTTPException(status_code=502, detail="Upstream error") from exc
        if not isinstance(payload, dict) or not isinstance(payload.get("text"), str):
            raise HTTPException(status_code=502, detail="Upstream error")
        text = payload["text"].strip()
        if text == "":
            raise HTTPException(status_code=502, detail="Upstream error")
        status = "completed"
        return TranscribeResponse(text=text, model=TRANSCRIBE_MODEL, seconds=_seconds(payload))
    finally:
        seconds = _seconds(payload)
        await record_usage(request.app.state.engine, user_id, UsageObservation(
            operation="transcribe",
            provider="openrouter",
            model=TRANSCRIBE_MODEL,
            status=status,
            tokens=token_counts(payload),
            charge=openrouter_charge(payload, _estimate(seconds)),
            request_bytes=len(json.dumps({"model": TRANSCRIBE_MODEL, "format": body.format}).encode("utf-8")),
            result_bytes=len(response.content) if response is not None else None,
            provider_request_id=provider_request_id(payload),
        ), request.app.state.usage_analytics)
