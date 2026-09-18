## Why

Packaged and unpackaged Desktop have no product analytics. Operators cannot see DAU, OS, app version, or whether sign-in, send, search, and updates are used. Aptabase is the chosen self-hosted backend: Electron-oriented ingest, session DAU, and a dashboard, without Mixpanel-style autocapture.

## What Changes

- Run a **self-hosted Aptabase** stack (Postgres + ClickHouse + app) for local and operator use. Desktop POSTs `POST {host}/api/v0/event` with an `A-SH-*` App Key.
- Electron main owns ingest. It attaches OS, OS version, locale, app version, Chromium engine, and `isDebug` (`!app.isPackaged`). It does **not** call `@aptabase/electron` `initialize()` (that API registers `aptabase-ipc` via `protocol.registerSchemesAsPrivileged`, which Electron allows only once; Desktop already registers `dsh-app`).
- Named events only. Aptabase never autocaptures clicks. Main allowlists event names and property keys; unknown names and forbidden values are dropped.
- Application renderer (`dsh-app://app/`) gets a fire-and-forget `dshDesktop.analytics.track` preload call so chrome can record named UI actions.
- Unpackaged traffic is Debug in the Aptabase dashboard; packaged is Release. Missing App Key or host disables tracking without blocking the app.
- Operator compose + a smoke path so a local session appears under Live View after the ~10s ClickHouse flush.

## Non-goals

- No Aptabase Cloud (`A-EU-*` / `A-US-*`).
- No PostHog, Umami, Countly, Sentry, or GlitchTip.
- No DOM clickstream, session replay, heatmaps, or feature flags.
- No Aptabase error-reporting API.
- No FastAPI ingest proxy; Desktop talks to Aptabase directly.
- No prompts, paths, emails, tokens, or message text in events.
- No OTel / session-log change (`session-telemetry-otel` stays as-is).

## Capabilities

### New Capabilities

- `desktop/aptabase-analytics`: self-hosted Aptabase ingest from the Electron shell, system properties, allowlist, lifecycle events, operator compose, local verification.
- `client/matreshka-analytics`: named GUI actions (sign-in, sign-out, settings, new session, send, web search) through the desktop track bridge, with no PII.

### Modified Capabilities

- None.

## Impact

- **Upstream seams:** `apps/desktop` (`main.ts`, `preload-app.ts`, `ipc.ts`, update coordinator) and Matreshka client plugins that own those UI actions (`ui-settings-models` sign-in/out, conversation send, sidebar new session, settings, web-search chrome).
- New operator compose under `ops/aptabase/`. No `backend/` FastAPI routes. Ingest contract matches Aptabase `EventsController` (`App-Key`, event name ≤60 chars, string/number props).
