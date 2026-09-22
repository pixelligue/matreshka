# Matreshka API

English | [中文](README.zh.md)

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

Create an operator user with the CLI, or `POST /v1/auth/register`. Omit `--password` to type it without echoing:

```bash
uv run matreshka-api create-user --email you@example.com
```

Run the API on the host (reload enabled). Bind loopback port 8016 so it matches the desktop default origin:

```bash
uv run fastapi dev --port 8016 --host 127.0.0.1
```

On Windows the process installs `WindowsSelectorEventLoopPolicy` so async psycopg can connect. The process reads `DATABASE_URL`, `REDIS_URL`, `SESSION_TTL_SECONDS`, `LLM_UPSTREAM_BASE_URL`, optional `LLM_UPSTREAM_API_KEY`, `LLMTOKENAPI_API_KEY`, and optional `UPDATE_ARTIFACT_ROOT`, `OPENROUTER_API_KEY`, `MATRESHKA_APTABASE_USAGE_APP_KEY`, and `MATRESHKA_APTABASE_HOST` from the environment (or `.env`). Missing required variables exit non-zero and name the variable. `SESSION_TTL_SECONDS` must be a positive integer. Do not commit API or Aptabase keys. Chat completions proxy Gonka (`POST {LLM_UPSTREAM_BASE_URL}/chat/completions`) with `LLM_UPSTREAM_API_KEY`. Public id `matrena` tries `zai-org/GLM-5.3-Flash`, then `deepseek-ai/DeepSeek-V4-Flash-0731` unless the first response is HTTP 401 or 403. If Gonka still fails, and `OPENROUTER_API_KEY` is set, the same request tries OpenRouter `z-ai/glm-5.3-flash`. If both keys are empty the response is 503. `UPDATE_ARTIFACT_ROOT` may be empty; the process still starts and `GET /v1/updates/desktop/{target}/{name}` returns 404 until it is set. `OPENROUTER_API_KEY` may be empty; the process still starts and consult/select return 503 until it is set.

Unauthenticated readiness: `GET /health` returns 200 when Postgres and Redis answer, otherwise 503. A down datastore does not prevent the HTTP process from starting.

Authenticated web search: `POST /v1/web/search` with `{ "query": "...", "provider": "keenable" | "llmtokenapi" }`. Default `keenable` calls Keenable's public search (`X-Keenable-Title: Matreshka`). `llmtokenapi` calls LLMTOKENAPI `POST /v1/search` with `LLMTOKENAPI_API_KEY`. The key never appears in the response.

Authenticated consult: `POST /v1/consult` with `{ "goal", "question", "plan"?, "evidence"? }` (32,000 UTF-8 byte cap) calls OpenRouter `deepseek/deepseek-v4.1-flash` and returns `{ "verdict": "ok"|"revise"|"risk", "detail" }`. Authenticated tool select: `POST /v1/tools/select` with `{ "goal", "candidates" }` (16,000 UTF-8 byte cap) calls OpenRouter Decisions `typesafe/jev-1.13` and returns `{ "tool", "confidence" }`. Authenticated skill choice: `GET /v1/skills` lists published stack skills kept on the API, and `POST /v1/skills/plan` with `{ "request", "files"? }` lets Jev choose `none` or one of those skills and returns its `SKILL.md`. The Host installs that file for later turns and does not show a consultant tool. The OpenRouter key never appears in the response.

## Usage records

The API creates `usage_events` in the existing database and records each authenticated upstream attempt through chat, consult, tool select, or the API's web-search route. Each row contains the user, operation, provider, public model ID, status, token counts when reported, request and result byte counts, and the provider's opaque request ID when available. It stores no prompt, completion, search query, or search result text. Chat rows include title-generation calls because they use the same completion route; the API does not yet identify their purpose separately.

`GET /v1/usage/events?limit=100` returns recent rows for the signed-in user (limit 1–500). `GET /v1/usage/summary` groups that user's rows by operation, provider, model, status, currency, and amount source. `amount_nanos` uses one billion units per RUB or USD; `reported` means the upstream response supplied the charge, `rate_estimate` means the API applied its built-in OpenRouter list rate, and null means the amount is unknown. The summary keeps these groups separate and counts rows with reported input tokens. An upstream failure or missing usage is recorded with an unknown amount, never as a zero charge.

The LLMTOKENAPI chat stream and search response supply a charge only when they include `usage.charged_kopecks`; OpenRouter supplies one when it includes `usage.cost`. Keenable's public endpoint supplies no charge. The desktop's default Keenable search and fetch providers call Keenable directly, so those requests remain visible in Harness session logs but do not enter `usage_events`. Existing sessions are not backfilled. If the database becomes unavailable after an upstream request starts, the API logs the accounting failure and preserves the upstream response.

Open `http://127.0.0.1:8016/analytics/costs` for the operator cost report. Sign in with a Matreshka API account; its bearer stays in the page's memory and the report API remains authenticated. The page groups the last 7, 30, 90, or 365 days by day, operation, provider, currency, and amount source. It never adds RUB to USD or estimates to reported charges. `GET /v1/usage/report?days=30` provides the same daily groups as JSON for the signed-in user.

To add request counts and categories to self-hosted Aptabase, create a separate Aptabase app and set `MATRESHKA_APTABASE_USAGE_APP_KEY=A-SH-...` plus `MATRESHKA_APTABASE_HOST` if it is not on the default local port 8000. After a usage row commits, the API sends an anonymous `upstream_usage` event with operation, provider, model, status, token counts, and known charge. It sends no user ID, email, prompt, search result, or provider request ID. Delivery is best effort; the database report remains the source for exact totals. Aptabase's built-in graph counts events rather than summing the charge property.

Desktop auto-update files are public. Allowed targets are `win-x64`, `mac-arm64`, and `mac-x64`. Channel metadata is `latest.yml` (Windows) or `latest-mac.yml` (macOS). Copy a packaged target into the artifact root:

```bash
uv run matreshka-api publish-desktop --target win-x64 --from /path/to/electron-builder/output
```

## Tests

From `backend/`:

```bash
uv run pytest
```
