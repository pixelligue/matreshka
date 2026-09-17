"""SSE framing that keeps the DONE sentinel as the literal string [DONE]."""

from __future__ import annotations


def data_frame(payload: str) -> str:
    """Return one SSE event: `data: <payload>` plus the blank-line terminator."""
    return f"data: {payload}\n\n"
