## 1. Backend consult

- [x] 1.1 Add optional `OPENROUTER_API_KEY` to settings and `.env.example`, and verify the API still starts when the key is blank
- [x] 1.2 Implement `POST /v1/consult` (session auth, 32k byte cap, Flash `deepseek/deepseek-v4.1-flash`, 503/400/502) and verify `backend/tests` cover unauthenticated, oversized, missing key, mocked success, and mocked 5xx without leaking the key

## 2. Backend Jev select

- [x] 2.1 Implement `POST /v1/tools/select` (session auth, 16k byte cap, Decisions `typesafe/jev-1.13`, empty candidates 400) and verify tests cover unauthenticated, empty candidates, missing key, mocked choice in the candidate list, and mocked 5xx without leaking the key

## 3. Host tools

- [x] 3.1 Add Host consult and tool-select tools that post to `{apiOrigin}` with the session bearer (web-search-matreshka pattern), hint Matrena when to use them, keep chat model `matrena`, and verify unit tests for the URLs, bearer, no OpenRouter key on the desktop, and no-session failure
