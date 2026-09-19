## Context

See proposal.md. Chat already proxies Matrena through `POST /v1/chat/completions` with `LLMTOKENAPI_API_KEY`. Web search is the pattern for a Host tool that posts to `{apiOrigin}` with the session bearer (`packages/web/web-search-matreshka`). Desktop must not hold OpenRouter keys (openspec context: models through our backend).

## Goals / Non-Goals

**Goals:** Two backend routes + two Host tools; Flash for short consults; Jev for tool name choice; hard byte caps.

**Non-Goals:** New llm-pi-ai provider, Muse Contributor, 1M context UI, changing Matrena mapping.

## Decisions

### 1. OpenRouter from the backend only

`OPENROUTER_API_KEY` in `backend/.env`, optional at process start (same idea as empty `UPDATE_ARTIFACT_ROOT`). Consult/select return 503 if blank. Desktop keeps `MATRESHKA_SESSION_TOKEN` only.

Alternative: TypeSafe direct for Jev and DeepSeek official for Flash — two extra keys. Rejected: one OpenRouter key.

### 2. Flash via chat completions, Jev via Decisions

Flash: `POST https://openrouter.ai/api/v1/chat/completions`, model `deepseek/deepseek-v4.1-flash`, non-stream JSON, short system prompt that forces `verdict` + `detail`. Prefer thinking off / low reasoning when the API allows it.

Jev: `POST https://openrouter.ai/api/alpha/decisions`, model `typesafe/jev-1.13`, one `choice` question over `candidates`. Not `/chat/completions`.

Alternative: one Flash call that both reviews and picks tools. Rejected: Jev is cheaper and typed for choice.

### 3. Caps, not full transcript

Consult: 32,000 UTF-8 bytes concatenated. Select: 16,000. Matrena (or the tool args) MUST trim; the API still 400s over cap.

### 4. Host tools, not a second provider

Mirror `web-search-matreshka`: tools `consult` and `select_tool` hit `{apiOrigin}`. System prompt: consult on hard code/analysis steps; select_tool when several tools could apply; skip both on greetings and trivial asks.

Alternative: backend silently wraps every Matrena request. Rejected: would call Flash/Jev on every turn.

### 5. Muse Contributor is out

Same model quality as Spark 1.3 at $0.10/$0.20 but Meta trains on prompts. Coding-agent transcripts are user code.

## Risks / Trade-offs

- **[Risk] Flash JSON is sloppy.** → Parse `verdict`; if missing, map to `risk` with the raw detail truncated.
- **[Risk] Jev English-primary.** → Tool names stay English ids; `goal` may be Russian — log and test.
- **[Risk] Extra latency.** → Consult only when Matrena calls the tool; Jev is 70–500 ms; Flash is slower — cap consult timeout (30s read).
- **[Trade-off] 503 without OpenRouter key.** → Local login/chat still works; consult tools fail loud.

## Migration Plan

Add env example, routes, Host tools, tests with httpx mocks. Rollback: omit the tools from the desktop overlay.

## Open Questions

None that block the spec. Pin OpenRouter Flash provider (`order`) only if live calls flake.
