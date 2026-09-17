# Matreshka API

FastAPI service that the desktop app will call for models. This tree is a uv project and is not part of the pnpm workspace.

## Prerequisites

- [uv](https://docs.astral.sh/uv/)
- Docker, for Postgres 16 and Redis 7

## Run locally

All commands below run from `backend/`.

Start the datastores (loopback only):

```bash
docker compose up -d
```

From the repository root the same file is `backend/compose.yaml`.

Copy environment variables and install Python dependencies:

```bash
cp .env.example .env
uv sync
```

Create an operator user. There is no HTTP signup. Omit `--password` to type it without echoing:

```bash
uv run matreshka-api create-user --email you@example.com
```

Run the API on the host (reload enabled). Bind loopback port 8016 so it matches the desktop default origin:

```bash
uv run fastapi dev --port 8016 --host 127.0.0.1
```

On Windows the process installs `WindowsSelectorEventLoopPolicy` so async psycopg can connect. The process reads `DATABASE_URL`, `REDIS_URL`, `SESSION_TTL_SECONDS`, `LLM_UPSTREAM_BASE_URL`, `LLMTOKENAPI_API_KEY`, and optional `UPDATE_ARTIFACT_ROOT` from the environment (or `.env`). Missing required variables exit non-zero and name the variable. `SESSION_TTL_SECONDS` must be a positive integer. Do not commit `LLMTOKENAPI_API_KEY`. Chat completions proxy LLMTOKENAPI (`POST {LLM_UPSTREAM_BASE_URL}/chat/completions`) with public catalog id `deepseek-ai-deepseek-v4-flash-0731` for `matrena`. `UPDATE_ARTIFACT_ROOT` may be empty; the process still starts and `GET /v1/updates/desktop/{target}/{name}` returns 404 until it is set.

Unauthenticated readiness: `GET /health` returns 200 when Postgres and Redis answer, otherwise 503. A down datastore does not prevent the HTTP process from starting.

Authenticated web search: `POST /v1/web/search` with `{ "query": "...", "provider": "keenable" | "llmtokenapi" }`. Default `keenable` calls Keenable's public search (`X-Keenable-Title: Matreshka`). `llmtokenapi` calls LLMTOKENAPI `POST /v1/search` with `LLMTOKENAPI_API_KEY`. The key never appears in the response.

Desktop auto-update files are public. Allowed targets are `win-x64`, `mac-arm64`, and `mac-x64`. Channel metadata is `latest.yml` (Windows) or `latest-mac.yml` (macOS). Copy a packaged target into the artifact root:

```bash
uv run matreshka-api publish-desktop --target win-x64 --from /path/to/electron-builder/output
```

## Tests

From `backend/`:

```bash
uv run pytest
```
