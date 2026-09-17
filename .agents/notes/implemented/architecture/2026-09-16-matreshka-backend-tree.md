# Agent Note: Matreshka backend tree outside the Cordis graph

Status: implemented

English | [中文](2026-09-16-matreshka-backend-tree.zh.md)

## Problem

Matreshka must call models through a product HTTP service, not as a local desktop provider. Putting that service inside the pnpm workspace, Cordis plugin graph, or `python/` SDK would inherit Node engines, DSH package names, and upstream merge noise. The desktop adapters already parse OpenAI Chat Completions SSE (`dsh-llm-deepseek` `parseSse` and `dsh-llm-pi-ai` `api: openai-completions`), so a second wire protocol would force a later adapter rewrite.

## Decision

The product API lives in `backend/` as a uv FastAPI project named `matreshka-api`, outside `pnpm-workspace.yaml`. Local Postgres 16 and Redis 7 run from `backend/compose.yaml` and publish only on `127.0.0.1`; Redis requires a password. Operators create users with `uv run matreshka-api create-user` (password prompt by default); there is no HTTP signup. Login issues an opaque Redis bearer session. `POST /v1/chat/completions` is an authenticated fixture SSE stream of literal `data:` frames ending in `[DONE]\n\n`, returned through Starlette `StreamingResponse`. `GET /health` stays up when a datastore is down and answers 503. On Windows the process installs `WindowsSelectorEventLoopPolicy` so async psycopg can connect. Schema `create_all` runs at startup and a failure does not abort the HTTP process.

## Alternatives considered

- **Sibling repository `matreshka-api`** — cleaner git history against upstream, but OpenSpec apply is repo-local to this checkout.
- **Hono/Elysia + Better Auth** — matches other local skills, rejected because the product choice is FastAPI with operator-created email/password users.
- **FastAPI `EventSourceResponse`** — `response_class` swallows `HTTPException` from the generator, and returning `ServerSentEvent` objects hits Starlette `.encode`; preformatted `StreamingResponse` bytes keep `[DONE]` literal.
- **JWT sessions** — revocation needs Redis anyway; opaque tokens are the session.
- **Failing process startup when Postgres is down** — would make `/health` unreachable, which violates the 503 readiness requirement.

## Consequences

Desktop, `packages/llm`, and credentials stay on upstream behavior until a later change points `dsh-llm-pi-ai` at this origin. Tests run against sqlite and fakeredis; they do not prove a live Windows+Postgres loop. Compose passwords are development secrets bound to loopback, not production hardening. CLI `--password` still exists for scripts and appears in process lists when used.
