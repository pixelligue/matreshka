# Agent Note: Matreshka Desktop Aptabase analytics

Status: implemented

English | [中文](2026-09-18-matreshka-aptabase-analytics.zh.md)

## Problem

Packaged and unpackaged Matreshka Desktop had no product analytics. Operators could not see daily users, OS, app version, or whether sign-in, send, settings, new session, web search, and updates were used. Session OTel upload is a different path and does not fill that gap.

## Decision

Desktop posts allowlisted events to a self-hosted Aptabase instance at `POST {host}/api/v0/event` with an `A-SH-` App Key. Default host is `http://127.0.0.1:8000`. Electron main owns ingest in `apps/desktop/src/analytics.ts` using Electron `net`, not `@aptabase/electron` `initialize()`, because that SDK registers `aptabase-ipc` through `protocol.registerSchemesAsPrivileged`, which Electron allows only once, and Desktop already registers `dsh-app`.

Every event carries `systemProps`: OS name and version, locale, app version, Chromium engine, SDK identifier, and `isDebug` (`!app.isPackaged`). Unpackaged traffic is Debug in the dashboard. The allowlist is `app_started`, `update_check`, `update_install`, `ui_sign_in`, `ui_sign_out`, `ui_settings_open`, `ui_new_session`, `ui_send`, and `ui_web_search`. Unknown names and email, token, path, or message-like values are dropped. Application documents get `dshDesktop.analytics.track` through preload IPC; the web profile no-ops when the bridge is missing. Operator compose lives in `ops/aptabase/`. ClickHouse flush is about ten seconds.

## Alternatives considered

- **Official `@aptabase/electron` `initialize()`.** It re-registers privileged schemes and disables tracking if called after `app.whenReady()`. Rejected.
- **Renderer HTTP with a baked App Key.** The key and allowlist would live in the web bundle. Rejected.
- **FastAPI ingest proxy.** Extra origin hop without a privacy gain; Aptabase ingest is already public with an App Key. Rejected.
- **DOM clickstream.** Aptabase has no autocapture; a click log would leak locale copy. Named chrome events won.

## Consequences

- Tracking is off until `MATRESHKA_APTABASE_APP_KEY` is set. Rollback is unsetting that variable.
- Local checks must use the Debug dashboard switch and wait for the ten-second flush.
- `ui_web_search` fires when a `web_search` tool row mounts, not on a dedicated composer toggle.
