"""SSE parser matching the fork parseSse contract (DONE last, terminator required)."""

from __future__ import annotations

DONE = "[DONE]"


class SseParseError(ValueError):
    pass


def parse_sse(body: str) -> list[str]:
    """Yield SSE data payloads. Require a terminated [DONE] as the last dispatched event.

    Events dispatch only on a blank-line terminator. An unterminated tail at EOF
    is truncation, even if it contains the letters [DONE].
    """
    if not body:
        raise SseParseError("SSE stream ended without [DONE]")

    normalized = body.replace("\r\n", "\n").replace("\r", "\n")
    lines = normalized.split("\n")
    ends_with_newline = normalized.endswith("\n")
    complete_lines = lines if ends_with_newline else lines[:-1]

    payloads: list[str] = []
    data_lines: list[str] = []

    def dispatch() -> bool:
        if not data_lines:
            return False
        payload = "\n".join(data_lines)
        data_lines.clear()
        payloads.append(payload)
        return payload == DONE

    for line in complete_lines:
        if line == "":
            if dispatch():
                return payloads
            continue
        if line.startswith(":"):
            continue
        if line.startswith("data:"):
            value = line[5:]
            if value.startswith(" "):
                value = value[1:]
            data_lines.append(value)

    raise SseParseError("SSE stream ended without [DONE]")
