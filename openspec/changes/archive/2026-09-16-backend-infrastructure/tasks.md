## 1. Scaffold

- [x] 1.1 Create `backend/` as a uv FastAPI project (`pyproject.toml`, `src/matreshka_api/`, `.gitignore` for `.venv`/`.env`) and verify `pnpm-workspace.yaml` still has no `backend` glob and the project name is not `@deepseek-ai/*`
- [x] 1.2 Add `backend/compose.yaml` (Postgres 16 + Redis 7) and `backend/.env.example` (`DATABASE_URL`, `REDIS_URL`, `SESSION_TTL_SECONDS`) and verify `docker compose -f backend/compose.yaml config` succeeds
- [x] 1.3 Write `backend/README.md` with compose up, `uv sync`, create-user, and `fastapi dev` and verify those commands are listed

## 2. Runtime

- [x] 2.1 Load settings from the environment and verify the process exits non-zero and names the variable when `DATABASE_URL` or `REDIS_URL` is missing
- [x] 2.2 Implement `GET /health` that checks Postgres and Redis and verify pytest returns 200 when both are up and 503 when either is down
- [x] 2.3 Create tables with SQLModel `create_all` on startup and verify a second start against the same database succeeds

## 3. Auth

- [x] 3.1 Add `User` (unique email, password hash) and `uv run matreshka-api create-user --email --password` and verify a created user exists and a duplicate email fails
- [x] 3.2 Implement `POST /v1/auth/login` and verify 200 + non-empty `token` for a valid user and 401 for unknown email or wrong password with no Redis session
- [x] 3.3 Require `Authorization: Bearer` on protected routes, store the token in Redis with TTL, and verify missing/unknown tokens return 401 and deleting the Redis key revokes the token
- [x] 3.4 Confirm there is no HTTP user-create/register route and verify `POST /v1/auth/register` is 404 or 405

## 4. Chat completions stub

- [x] 4.1 Add Pydantic request/chunk models matching the fork subset (`model`, `messages`, `stream`, `choices[].delta.content`) and verify `stream: false` returns 400
- [x] 4.2 Implement authenticated `POST /v1/chat/completions` fixture SSE (no upstream provider) and verify 401 without a token and 200 `text/event-stream` with a token
- [x] 4.3 Emit complete `data: …\n\n` events, literal `[DONE]` last with terminator, and verify a test parser (same rules as `parseSse`: DONE last, unterminated tail fails) accepts the body and at least one chunk has string `choices[0].delta.content`

## 5. Isolation

- [x] 5.1 Confirm git diff has no edits under `packages/`, `apps/`, or `python/` and verify `backend/` does not import `@deepseek-ai/*`
