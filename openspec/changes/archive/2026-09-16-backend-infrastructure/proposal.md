## Why

Matreshka must call models through our backend, not as a local desktop provider. There is no service, datastore, or login yet. This change stands up that backend so a later change can attach real providers without inventing a second wire protocol.

## What Changes

- Add a FastAPI service under `backend/` at the repo root, outside the pnpm workspace and Cordis graph.
- Run PostgreSQL and Redis via Docker Compose for local development.
- Add email/password login that issues a bearer session. Operators create users with a CLI or SQL; there is no public signup.
- Expose an authenticated OpenAI Chat Completions SSE stub (`POST /v1/chat/completions`) whose framing matches what `dsh-llm-pi-ai` / `dsh-llm-deepseek` already parse, so the desktop can point `api: openai-completions` at this origin later.

## Non-goals

- No real LLM providers, API keys, or upstream proxying (next change).
- No edits to `packages/llm`, desktop host, credentials, or routing.
- No Better Auth, OAuth, self-registration, email verification, or billing.
- No DSH `StreamChunk` on the wire. Adapters own that conversion.
- No rebrand, package rename, or UI restyle.

## Capabilities

### New Capabilities

- `backend/runtime`: FastAPI process, Docker Compose (Postgres, Redis), health, configuration.
- `backend/auth`: email/password verification, Redis-backed bearer sessions, operator user-create CLI.
- `backend/chat-completions`: authenticated OpenAI-compatible streaming endpoint with fixture tokens and a terminating `[DONE]`.

### Modified Capabilities

- None. Main specs are empty.

## Impact

- **Upstream seam:** none. New tree `backend/` only; DSH packages, `apps/*`, and `python/` SDK stay untouched.
- New Python toolchain (uv, FastAPI, SQLModel, HTTPX, pytest) lives only under `backend/`.
- Later desktop work (out of scope) will set `dsh-llm-pi-ai` `baseURL` to this service.
