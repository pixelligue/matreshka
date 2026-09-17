## Context

See proposal.md. Chat already proxies OpenAI SSE with `PUBLIC_TO_UPSTREAM`. Web search in the shipped base is `web-search-deepseek` + `web-fetch-http`. **Ownership:** backend holds `LLMTOKENAPI_API_KEY` and talks to LLMTOKENAPI and Keenable public search. Host `ctx.web` providers select Keenable directly (no secret) or the Matreshka search proxy (session token).

## Goals / Non-Goals

**Goals:**

- Chat completions hit LLMTOKENAPI `/v1/chat/completions` with catalog id `deepseek-ai-deepseek-v4-flash-0731`.
- Two Host search ids: `keenable`, `llmtokenapi`.

**Non-Goals:**

- Do not add a new fetch vendor. Do not expand the model picker.

## Decisions

### 1. Reuse the chat proxy, change mapping and key name

Keep SSE rewrite. Map `matrena` → `deepseek-ai-deepseek-v4-flash-0731`. Rename the required key env to `LLMTOKENAPI_API_KEY`. Default documented base `https://api.llmtokenapi.ru/v1`. Redact the key in 502 bodies (existing helper). Tests mock HTTPX.

### 2. Keenable public from Host; LLMTOKENAPI search via API

Keenable `POST https://api.keenable.ai/v1/search/public` with `X-Keenable-Title: Matreshka` has no secret, so the Host plugin may call it. LLMTOKENAPI search needs the server key, so Host POSTs `{apiOrigin}/v1/web/search` with the session token and `provider: llmtokenapi`.

One new package `@deepseek-ai/dsh-web-search-matreshka` registers both providers. web-app overlay disables `web-search-deepseek` and sets `searchProvider: keenable`.

### 3. Redirects off on every provider request

Match the web AGENTS rule: `redirect: error` / HTTPX `follow_redirects=False`.

## Risks / Trade-offs

- **[Risk] Catalog id drift.** → Pin the id from a live `GET /v1/models` in this change; unknown ids stay 400.
- **[Trade-off] Keenable traffic from the Host, not the API.** → Avoids putting a public-search hop behind auth for the default path; LLMTOKENAPI remains server-only.

## Migration Plan

Operators replace `LLM_UPSTREAM_API_KEY` with `LLMTOKENAPI_API_KEY` and set `LLM_UPSTREAM_BASE_URL=https://api.llmtokenapi.ru/v1`.

## Open Questions

None.
