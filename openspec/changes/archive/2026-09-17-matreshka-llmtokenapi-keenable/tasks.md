## 1. Backend LLMTOKENAPI chat

- [x] 1.1 Switch required key env to `LLMTOKENAPI_API_KEY`, map `matrena` to `deepseek-ai-deepseek-v4-flash-0731`, reject that catalog id from the client, and verify pytest: missing key names `LLMTOKENAPI_API_KEY`, chat sends the catalog id upstream, client chunks say `matrena`, catalog id and Gonka vendor id return 400 with zero upstream calls, 502 body has no key

## 2. Backend web search

- [x] 2.1 Add authenticated `POST /v1/web/search` for `keenable` (default, public Keenable) and `llmtokenapi` (LLMTOKENAPI `/v1/search` with the server key), and verify pytest: 401 without token, default hits Keenable mock, `llmtokenapi` hits LLMTOKENAPI mock without leaking the key, `exa` is 400

## 3. Host composition

- [x] 3.1 Add `@deepseek-ai/dsh-web-search-matreshka` registering `keenable` (keyless public) and `llmtokenapi` (session-token proxy), disable DeepSeek search in the Matreshka web composition, default `searchProvider: keenable`, and verify unit specs for mapping, keyless Keenable headers, unavailable LLMTOKENAPI search without a session, and redirect rejection
