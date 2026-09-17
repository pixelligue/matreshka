## 1. Settings

- [x] 1.1 Add `LLM_UPSTREAM_BASE_URL` and `LLM_UPSTREAM_API_KEY` to settings and `.env.example` (empty placeholders) and verify a missing either exits non-zero naming the variable
- [x] 1.2 Confirm `GET /health` still returns 200 when Postgres and Redis are up without calling the upstream
- [x] 1.3 Add `httpx` and verify it is listed in `backend/pyproject.toml`

## 2. Proxy

- [x] 2.1 Replace the fixture generator with HTTPX `POST {base}/chat/completions` (`stream: true`, Bearer upstream key) and verify a mock upstream SSE is forwarded with `text/event-stream`
- [x] 2.2 Allowlist only `deepseek-ai/DeepSeek-V4-Flash-0731` and `zai-org/GLM-5.3-Flash` and verify other ids including `matreshka-stub` return 400 with zero upstream calls
- [x] 2.3 Forward `zai-org/GLM-5.3-Flash` and verify the mock saw that model id
- [x] 2.4 Append `data: [DONE]\n\n` when the upstream omits it and verify the parser's last payload is `[DONE]`
- [x] 2.5 Map upstream 5xx / connect errors to 502 and verify the response body does not contain the upstream key
- [x] 2.6 Keep unauthenticated chat at 401 and `stream: false` at 400

## 3. Isolation

- [x] 3.1 Confirm git does not contain the live API key and `packages/` / `apps/` are untouched
