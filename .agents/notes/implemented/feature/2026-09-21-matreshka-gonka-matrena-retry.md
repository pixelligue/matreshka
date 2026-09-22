# Agent Note: Matrena retries two Gonka models

Status: implemented

English | [中文](2026-09-21-matreshka-gonka-matrena-retry.zh.md)

## Problem

Chat was proxied to LLMTOKENAPI under one catalog id. Operators need one public model, `matrena`, served by Gonka, with a second model when the first attempt fails.

## Decision

`POST /v1/chat/completions` for `matrena` calls `{LLM_UPSTREAM_BASE_URL}/chat/completions` with `LLM_UPSTREAM_API_KEY`. It tries `zai-org/GLM-5.3-Flash`, then `deepseek-ai/DeepSeek-V4-Flash-0731`, unless the first response is HTTP 401 or 403. If Gonka produced no stream, it tries OpenRouter `z-ai/glm-5.3-flash` with `OPENROUTER_API_KEY`. The client SSE still says `matrena`. If both keys are empty the response is 503. Web search still uses LLMTOKENAPI.

## Alternatives considered

- **Expose both Gonka ids in the desktop picker.** Rejected: the product id stays one model.
- **Retry 401.** Rejected: a bad key fails both models the same way.

## Consequences

A failed first model adds one extra upstream call before the client sees 502. Mid-stream failures are not retried, because bytes may already have been sent.
