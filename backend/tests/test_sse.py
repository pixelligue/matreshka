from __future__ import annotations

import json

import pytest

from tests.sse_parser import DONE, SseParseError, parse_sse


def test_parser_yields_payloads_and_done() -> None:
    events = parse_sse('data: {"a":1}\n\ndata: [DONE]\n\n')
    assert events == ['{"a":1}', DONE]


def test_parser_ignores_comments() -> None:
    events = parse_sse(': keep-alive\n\ndata: {"a":1}\n\ndata: [DONE]\n\n')
    assert events == ['{"a":1}', DONE]


def test_parser_stops_after_done() -> None:
    events = parse_sse('data: [DONE]\n\ndata: {"late":1}\n\n')
    assert events == [DONE]


def test_parser_unterminated_stream_fails() -> None:
    with pytest.raises(SseParseError, match=r"without \[DONE\]"):
        parse_sse('data: {"a":1}\n\n')


def test_parser_empty_stream_fails() -> None:
    with pytest.raises(SseParseError, match=r"without \[DONE\]"):
        parse_sse("")


def test_parser_mid_event_close_fails() -> None:
    with pytest.raises(SseParseError, match=r"without \[DONE\]"):
        parse_sse('data: {"a"')


def test_parser_unterminated_done_tail_fails() -> None:
    with pytest.raises(SseParseError, match=r"without \[DONE\]"):
        parse_sse('data: {"a":1}\n\ndata: [DONE]')


def test_parser_chunk_shape_has_delta_content() -> None:
    body = (
        'data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n'
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'
        'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n'
        "data: [DONE]\n\n"
    )
    payloads = parse_sse(body)
    assert payloads[-1] == DONE
    found = False
    for payload in payloads[:-1]:
        chunk = json.loads(payload)
        content = chunk["choices"][0]["delta"].get("content")
        if isinstance(content, str) and content:
            found = True
    assert found
