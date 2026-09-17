## Why

Chat still proxies Gonka vendor ids. Matreshka must call LLMTOKENAPI with public catalog ids and keep `LLMTOKENAPI_API_KEY` on the API process. Desktop web search still mounts DeepSeek search, which needs a DeepSeek key the product no longer has. Operators need two search backends: Keenable (keyless public) and LLMTOKENAPI search (server key).

## What Changes

- **BREAKING:** chat maps `matrena` to public id `deepseek-ai-deepseek-v4-flash-0731` from `GET https://api.llmtokenapi.ru/v1/models`. The Gonka id `deepseek-ai/DeepSeek-V4-Flash-0731` is rejected. Upstream base is `https://api.llmtokenapi.ru/v1`.
- Required env is `LLMTOKENAPI_API_KEY` (not `LLM_UPSTREAM_API_KEY`). The key MUST NOT appear in logs, error bodies, or client responses.
- Authenticated `POST /v1/web/search` proxies Keenable public search or LLMTOKENAPI `POST /v1/search`.
- Matreshka desktop/web composition disables `web-search-deepseek`, registers Keenable and LLMTOKENAPI search providers, default `searchProvider: keenable`. Fetch stays HTTP.

## Non-goals

- No embeddings, images, audio, map/crawl, or Agent API.
- No extra models in the GUI picker.
- No Keenable API key (public endpoint only).
- No replacing `web-fetch-http`.
- Do not put `LLMTOKENAPI_API_KEY` on the desktop.

## Capabilities

### New Capabilities

- `backend/web-search`: authenticated search proxy for Keenable and LLMTOKENAPI.
- `host/matreshka-web-search`: Host `ctx.web` providers `keenable` and `llmtokenapi`.

### Modified Capabilities

- `backend/chat-completions`: upstream public model id and LLMTOKENAPI chat completions.
- `backend/runtime`: `LLMTOKENAPI_API_KEY` required; `LLM_UPSTREAM_BASE_URL` is the LLMTOKENAPI `/v1` origin.

## Impact

- **Upstream seams:** `backend/` chat/settings; `packages/web` new search plugin; `packages/bundle/web-app/cordis.patch.yml` (disable DeepSeek search).
- Tests use fake HTTP servers, not live LLMTOKENAPI or Keenable.
