## Context

See proposal.md for motivation. The fork already speaks OpenAI Chat Completions SSE through `dsh-llm-deepseek` (`parseSse`, `WireChunk`) and `dsh-llm-pi-ai` (`api: openai-completions`, `baseURL`). `StreamChunk` is adapter-internal and must not appear on this API. OpenSpec apply is repo-local, so the service lives in `backend/` inside this repository, not a sibling repo.

**Ownership:** this change is backend-only. Desktop, `packages/llm`, credentials, and routing stay on upstream behavior.

## Goals / Non-Goals

**Goals:**

- A bootable FastAPI app with Compose Postgres + Redis.
- Email/password sessions that Electron can send as `Authorization: Bearer`.
- A stub `/v1/chat/completions` whose SSE bytes would satisfy `parseSse` in `packages/llm/llm-deepseek/src/protocols/chat-completions/sse.ts`.

**Non-Goals:**

- Do not add a Cordis plugin or a new DSH adapter in this change.
- Do not proxy a real provider.
- Do not implement cookie auth, OAuth, or JWT-as-session-store.

## Decisions

### 1. Tree: `backend/` outside pnpm

The pnpm workspace (`packages/*/*`, `apps/*`, `python/`) stays Node/Cordis. A Python service inside it would inherit the wrong package manager and engines. `backend/` is a uv project with its own lockfile.

Alternative: sibling `matreshka-api` repo — cleaner git history, but apply cannot write outside this project.

### 2. Stack: uv + FastAPI + SQLModel + Redis

Matches the FastAPI skill: uv, Pydantic v2, SQLModel for Postgres, HTTPX reserved for the next (provider) change, pytest. Redis via `redis.asyncio`.

Alternative: FastAPI + raw SQLAlchemy — more boilerplate. Alternative: Django — heavier than an SSE gateway.

### 3. SSE: Starlette `StreamingResponse` with literal `data:` frames

The handler returns `StreamingResponse` whose body is preformatted SSE text (`data: <payload>\n\n`), ending with the literal `[DONE]` frame. FastAPI `EventSourceResponse` is not used: as `response_class` it swallows `HTTPException` from the generator, and returning `ServerSentEvent` objects through Starlette's stream path calls `.encode` on the event. Do not take [fastapi-openai-compat](https://github.com/deepset-ai/fastapi-openai-compat) or LiteLLM.

Pydantic models for request/chunk follow `WireRequest` / `WireChunk` in `packages/llm/llm-deepseek/src/protocols/chat-completions/types.ts` (subset: `model`, `messages`, `stream`, `delta.content`). Fixture stream: role chunk, one or more content deltas, `finish_reason: stop`, then `[DONE]` with `\n\n`.

`stream: false` raises 400 before the stream starts. A missing bearer token raises 401 even when `stream` is false.

Alternative: FastAPI `EventSourceResponse` — rejected after the two failure modes above. Alternative: NDJSON — the fork parsers expect SSE + `[DONE]`.

### 4. Auth: opaque Redis session, not JWT, not Better Auth

Login checks a SQLModel `User` (email unique, password hash via pwdlib/argon2). Unknown emails still run `verify_password` against a dummy hash so the 401 timing matches a wrong password. Success writes a random token in Redis (`session:<token> -> user_id`, TTL must be a positive integer, default 7 days) and returns `{ "token": "..." }`. Protected routes read `Authorization: Bearer`. There is no logout HTTP route in this change; deleting the Redis key revokes the session.

Opaque tokens fit Redis (already required) and Electron (header, not cookies). JWT would not use Redis for the session itself and is harder to revoke.

CLI: `uv run matreshka-api create-user --email …` prompts for the password; `--password` remains for scripts and tests. No HTTP signup.

### 5. Compose layout

`backend/compose.yaml`: `postgres` (16) and `redis` (7) published on `127.0.0.1` only. Redis requires the password in `.env.example`. API runs on the host via `uv run` for fast reload. Env file `backend/.env.example` lists `DATABASE_URL`, `REDIS_URL`, `SESSION_TTL_SECONDS`.

Schema: SQLModel `create_all` on startup. A failed bootstrap does not abort the process; `GET /health` then returns 503. Alembic waits until the provider change adds tables worth migrating.

On Windows the API installs `WindowsSelectorEventLoopPolicy` before serving so async psycopg can use the loop.

## Risks / Trade-offs

- **[Risk] SSE framing drifts from the fork parser.** → Emit preformatted `data:` strings through `StreamingResponse` and assert the byte contract in a pytest that feeds the same framing rules as `parseSse` (DONE last, blank-line terminator).
- **[Risk] `backend/` makes upstream merges noisier.** → Keep the tree self-contained; never import `@deepseek-ai/*` from Python.
- **[Risk] Stub model id `matreshka-stub` will not match a later provider catalog.** → Next change replaces the generator; path and SSE contract stay.
- **[Trade-off] Host-run API vs Compose-run API.** Host-run is faster to iterate; Compose remains the datastore source of truth.

## Migration Plan

Greenfield. Operators: `docker compose up -d` in `backend/`, `uv sync`, `uv run matreshka-api create-user`, `uv run fastapi dev`. Rollback: `docker compose down` and delete `backend/` if the change is abandoned.

## Open Questions

None that block this change. Provider base URL, key, and model ids belong to the next OpenSpec change.
