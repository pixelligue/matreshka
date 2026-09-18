"""OpenRouter consult and Jev select helpers."""

from __future__ import annotations

from fastapi import HTTPException

from matreshka_api.chat import redact_secret
from matreshka_api.settings import Settings

OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_DECISIONS_URL = "https://openrouter.ai/api/alpha/decisions"
FLASH_MODEL = "deepseek/deepseek-v4.1-flash"
JEV_MODEL = "typesafe/jev-1.13"
CONSULT_MAX_BYTES = 32_000
SELECT_MAX_BYTES = 16_000
OPENROUTER_REFERER = "https://github.com/pixelligue/matreshka"
OPENROUTER_TITLE = "Matreshka"

# OpenRouter list prices used for operator estimates (USD per 1M tokens).
FLASH_USD_PER_M_INPUT = 0.15
FLASH_USD_PER_M_OUTPUT = 0.60
JEV_USD_PER_M_INPUT = 0.042
JEV_USD_PER_M_OUTPUT = 0.0


def estimate_usd(model: str, input_tokens: int, output_tokens: int) -> float:
    """Return a USD estimate from list prices. Not the billed invoice."""
    if model == JEV_MODEL:
        input_rate, output_rate = JEV_USD_PER_M_INPUT, JEV_USD_PER_M_OUTPUT
    else:
        input_rate, output_rate = FLASH_USD_PER_M_INPUT, FLASH_USD_PER_M_OUTPUT
    return (input_tokens * input_rate + output_tokens * output_rate) / 1_000_000


def usage_from_payload(model: str, payload: object) -> dict[str, float | int] | None:
    if not isinstance(payload, dict):
        return None
    raw = payload.get("usage")
    if not isinstance(raw, dict):
        return None
    input_tokens = raw.get("prompt_tokens", raw.get("input_tokens"))
    output_tokens = raw.get("completion_tokens", raw.get("output_tokens"))
    if not isinstance(input_tokens, int) or not isinstance(output_tokens, int):
        return None
    return {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "usd": round(estimate_usd(model, input_tokens, output_tokens), 8),
    }


def openrouter_key(settings: Settings) -> str:
    key = settings.openrouter_api_key
    if key is None or not key.strip():
        raise HTTPException(status_code=503, detail="OpenRouter is not configured")
    return key


def utf8_size(*parts: str) -> int:
    return sum(len(part.encode("utf-8")) for part in parts)


def reject_over_cap(size: int, cap: int) -> None:
    if size > cap:
        raise HTTPException(status_code=400, detail="payload too large")


def openrouter_headers(key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "HTTP-Referer": OPENROUTER_REFERER,
        "X-Title": OPENROUTER_TITLE,
    }


def upstream_http_error(key: str, body: str) -> HTTPException:
    return HTTPException(
        status_code=502,
        detail=redact_secret("Upstream error", key) if key in body else "Upstream error",
    )
