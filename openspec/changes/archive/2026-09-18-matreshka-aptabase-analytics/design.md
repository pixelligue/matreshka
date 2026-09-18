## Context

See proposal.md. Aptabase server (cloned `aptabase/aptabase`) is a .NET app plus Postgres (apps/users) and ClickHouse (events). Ingest is `POST /api/v0/event` with `App-Key`. The dashboard shows Daily Users, Sessions, Events, duration, OS, versions, countries, event names, event props, Live View, and User Sessions. Debug vs Release is `systemProps.isDebug`; unpackaged Electron must land in Debug.

The Electron SDK (`@aptabase/electron`) POSTs that same body, auto-fills OS/version/locale, rotates sessions after 1 hour idle, and does **not** autocapture. `initialize()` also calls `protocol.registerSchemesAsPrivileged` for `aptabase-ipc` so the renderer can `fetch("aptabase-ipc://trackEvent")`. Electron allows that API **once**, before ready. `apps/desktop/src/main.ts` already registers `dsh-app` there. Calling official `initialize()` would throw or disable `dsh-app`. Application documents currently get only `{ protocolVersion: 1 }` from `preload-app.ts`; Host is a child process without Electron APIs.

Aptabase self-host App Keys are `A-SH-*` and require an explicit `host`. Cloud `A-EU-*` / `A-US-*` are out of scope. Ingest is buffered and flushed about every **10 seconds**; local checks must wait. Failed flushes discard the batch. Daily unique users are a salted hash of IP + user-agent, not a stable device id.

**Ownership:** Electron shell owns ingest, allowlist, and lifecycle events. Client plugins own named UI calls. FastAPI does not ingest. Aptabase is an operator service beside the API, not inside it.

## Goals / Non-Goals

**Goals:**

- Match the Aptabase ingest JSON (event name ≤60, prop keys ≤40, string values truncated server-side at 180).
- One allowlist in the shell so a hostile renderer cannot invent events or attach email/prompt.
- Local compose + README so an operator can see `app_started` and a UI event in Live View.

**Non-Goals:**

- Do not vendor or fork the Aptabase server; run `ghcr.io/aptabase/aptabase`.
- Do not use `@aptabase/electron/renderer` or `aptabase-ipc`.
- Do not track Host tool results or session logs.

## Decisions

### 1. Own the ingest helper; do not call SDK `initialize()`

Reimplement the MIT SDK POST in `apps/desktop` (Electron `net`, session id, env props). Keep the same URL, headers, and body as `aptabase-electron/src/main.ts`.

Alternative: `pnpm patch` to skip protocol registration — rejected; a patch tracks upstream churn for one function.

Alternative: merge `dsh-app` and `aptabase-ipc` in one `registerSchemesAsPrivileged` and still call `initialize()` — rejected; `initialize()` registers schemes again.

### 2. Preload IPC instead of renderer HTTP

Expose `dshDesktop.analytics.track` on `dsh-app://app/` (and optionally shell). IPC to main; main allowlists then POSTs. App Key stays in the main process (`MATRESHKA_APTABASE_APP_KEY`, host `MATRESHKA_APTABASE_HOST` default `http://127.0.0.1:8000`).

The web profile has no preload: client calls `window.dshDesktop?.analytics?.track` and no-ops.

Alternative: renderer fetch to Aptabase with a baked key — rejected; key and allowlist would live in the web bundle.

Alternative: Host plugin POST — rejected for UI clicks; Host does not see those clicks. Tool-level events stay a later change.

### 3. Named chrome events, not DOM clicks

Aptabase has no autocapture. Instrument the product actions in the proposal catalog. A clickstream of every button would leak locale copy and drown the dashboard.

### 4. Operator compose, not FastAPI

`ops/aptabase/docker-compose.yml` follows `aptabase/self-hosting`: Postgres 15, ClickHouse 23.8, app on 8000. First account is email + activation link in `docker compose logs aptabase`. Create an app, copy `A-SH-` key.

Desktop → Aptabase is a second origin from the Matreshka API (8016). CORS on ingest is already `AllowAny`.

### 5. Local verification

1. `docker compose -f ops/aptabase/docker-compose.yml up -d`
2. Open `http://127.0.0.1:8000`, register, activate from logs, create app "Matreshka".
3. Set `MATRESHKA_APTABASE_APP_KEY` and `MATRESHKA_APTABASE_HOST=http://127.0.0.1:8000`.
4. `pnpm run start:desktop` (unpackaged ⇒ Debug).
5. Sign in, send a message, open Settings, Sign out.
6. Dashboard: **Debug** (bug icon), wait ≥10s, Live View shows a session with `app_started` then `ui_*`. OS/version widgets populate from `systemProps`.
7. Optional: `POST /api/v0/event` with a fake body to prove ingest without Desktop.
8. Unit tests: allowlist drops unknown names and `email`; missing key sends nothing; unpackaged `isDebug` is true.

## Risks / Trade-offs

- **[Risk] Official `initialize()` after `app.whenReady()` disables tracking.** → Own helper can start after the window exists; still send `app_started` once.
- **[Risk] ClickHouse flush delay looks like "nothing works".** → README and tasks call out 10s and Debug mode.
- **[Risk] Public ingest URL with only an App Key.** → Self-host on loopback or a private network; do not put prompts in events even if the key leaks.
- **[Risk] GeoIP from client IP on a local compose is empty or localhost.** → Accept; OS/version/events still prove the pipe.
- **[Trade-off] No Host tool events in v1.** → `ui_web_search` is the chrome control, not every `web_search` tool call.
- **[Trade-off] AGPL server image, MIT client.** → We run the image unmodified; our helper is original code matching a public ingest API.

## Migration Plan

Tracking is off until the operator sets the App Key. Existing installs unchanged. Rollback: unset the env var.

## Open Questions

None.
