## Why

The backend still streams a fixture (`matreshka-stub`). Operators now have an OpenAI-compatible Gonka proxy and two model ids. Chat must forward those models through our authenticated API without putting the upstream key on the desktop.

## What Changes

- **BREAKING:** `POST /v1/chat/completions` stops serving fixture tokens. It proxies SSE to the configured upstream (`POST {base}/chat/completions`) using the server-side API key.
- Allow only `deepseek-ai/DeepSeek-V4-Flash-0731` and `zai-org/GLM-5.3-Flash`. Any other `model` (including `matreshka-stub`) returns 400.
- Require `LLM_UPSTREAM_BASE_URL` and `LLM_UPSTREAM_API_KEY` from the environment. Missing values fail process start and name the variable, same as database URLs.
- Keep Matreshka bearer auth. Never return the upstream key in logs, errors, or responses.
- Tests use a fake upstream HTTP server, not the live Gonka URL.

## Non-goals

- No desktop, `packages/llm`, or `dsh-llm-pi-ai` adapter in this change.
- No MiniMax or other Gonka catalog models unless later listed.
- No non-stream JSON completions (`stream: false` stays 400).
- No billing, usage tables, or key rotation UI.
- Do not commit the upstream API key.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `backend/runtime`: process requires upstream base URL and API key env vars.
- `backend/chat-completions`: authenticated SSE is an upstream proxy for the allowlisted models, not a fixture.

## Impact

- **Upstream seam:** `backend/` only (`chat.py`, settings, `.env.example`). DSH packages stay untouched.
- Add HTTPX for streaming the Gonka OpenAI-compatible API ([docs.gonkabroker.com compatibility](https://docs.gonkabroker.com/reference/api-compatibility)).
- Local `.env` (gitignored) holds the key; `.env.example` has empty placeholders.
