## Context

See proposal.md. The stub in `backend/src/matreshka_api/chat.py` yields fixture SSE. The operator upstream is an OpenAI-compatible proxy: GET `{base}` documents `POST {base}/chat/completions`. Probed catalog includes the two allowlisted ids plus MiniMax, which this change ignores. **Ownership:** backend only. Desktop adapters stay on upstream DSH until a later change.

## Goals / Non-Goals

**Goals:**

- Replace the fixture generator with HTTPX streaming to `{LLM_UPSTREAM_BASE_URL}/chat/completions`.
- Allowlist two model ids. Keep Matreshka bearer auth. Keep `[DONE]` framing.

**Non-Goals:**

- Do not edit `packages/llm` or the desktop host.
- Do not call MiniMax.
- Do not persist the API key in git.

## Decisions

### 1. Env names, not a second config file

`LLM_UPSTREAM_BASE_URL` (no trailing slash) and `LLM_UPSTREAM_API_KEY` join existing settings. Missing either exits like `DATABASE_URL`. `.env.example` uses empty placeholders. The live hostname and key stay in gitignored `.env`.

Alternative: read the key from Postgres — extra table for one secret.

### 2. Forward SSE bytes, append `[DONE]` if missing

POST JSON `{model, messages, stream: true}` with `Authorization: Bearer <upstream key>`. Stream `text/event-stream` through the existing `StreamingResponse` path. Do not re-encode chunks. If the upstream body has no terminated `[DONE]`, append `data: [DONE]\n\n`.

Alternative: buffer the full stream — breaks first-token latency.

### 3. Allowlist in settings, 400 before HTTP

Exact strings: `deepseek-ai/DeepSeek-V4-Flash-0731`, `zai-org/GLM-5.3-Flash`. Unknown models never hit the network.

### 4. Status mapping

Our 401 remains "no Matreshka session". Upstream 4xx/5xx and connect errors become 502. Strip any `sk_` / `Bearer` substring from error text.

### 5. Tests against a fake origin

pytest uses `httpx.MockTransport` (or respx) on localhost. No live Gonka calls in CI.

## Risks / Trade-offs

- **[Risk] Key leaked in chat history.** → Never write it to tracked files; rotate if the key was shared beyond this machine.
- **[Risk] Upstream path is `/chat/completions` not `/v1/chat/completions`.** → Join `base_url.rstrip("/") + "/chat/completions"`; the function already is the OpenAI root.
- **[Trade-off] Health ignores upstream.** → Datastore readiness stays independent of Gonka.

## Migration Plan

Add the two env vars, `uv add httpx`, restart `fastapi dev`. Clients that sent `matreshka-stub` must switch model ids.

## Open Questions

None that block this change. Desktop `baseURL` pointing at Matreshka is a later change.
