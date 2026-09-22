# Design

## Context

See proposal.md. Today: CLI `create-user`, `POST /v1/auth/login`, Redis bearer, Desktop overlay posts password to the API. Landing is marketing-only. Electron already uses an internal `dsh-app://` scheme; OS deep links need a separate protocol. CORS on the API already allows `*`.

**Ownership:** FastAPI auth; landing pages; Electron protocol + IPC; Client overlay. No Cordis loop change.

## Goals / Non-Goals

**Goals:** Public register; website login; packaged Desktop handoff via one-time code; unpackaged local login unchanged.

**Non-Goals:** Email verify, OAuth, rewriting `dsh-app://`.

## Decisions

### 1. One-time Redis code, not the bearer in the protocol URL

Website login still returns a session token for the browser. `POST /v1/auth/desktop-code` (bearer) stores `desktop-code:{code} -> user_id` in Redis for 60s. Desktop `POST /v1/auth/exchange` consumes it and mints a **new** Desktop session. Website and Desktop sessions are independent.

Alternative: put the bearer in `matreshka://auth?token=`. Rejected: history, logs, and referrer leak.

### 2. OS protocol `matreshka://auth?code=`

electron-builder `protocols` plus `app.setAsDefaultProtocolClient('matreshka')`. Parser is a pure module. Windows second-instance argv and macOS `open-url` both feed the same parser. Do not add `matreshka` to Chromium `registerSchemesAsPrivileged` (that stays `dsh-app` only).

### 3. Local login gated by unpackaged / missing bridge

`dshDesktop.auth.localLogin` is true when `!app.isPackaged` unless `MATRESHKA_LOCAL_LOGIN=0`, or when `MATRESHKA_LOCAL_LOGIN=1`. The web GUI has no auth bridge and keeps the password form. Packaged Desktop shows only “Sign in on the website”.

Landing origin: `MATRESHKA_LANDING_ORIGIN` default `http://127.0.0.1:3020`. Main process `shell.openExternal` only that origin’s login path with `?next=desktop`.

### 4. Landing pages call FastAPI from the browser

`NEXT_PUBLIC_MATRESHKA_API_ORIGIN` default `http://127.0.0.1:8016`. No Next.js BFF. Register `201`; duplicate `409`.

## Risks / Trade-offs

- **[Risk] Protocol not registered on first unpackaged run.** → Unpackaged still uses local login; protocol is for packaged (and optional website tests).
- **[Risk] 60s TTL too short if the browser is slow.** → Operator can click website sign-in again.
- **[Trade-off] CORS remains `*`.** → Already shipped; tightening origins is a later change.

## Migration Plan

Existing CLI users still log in. Packaged Desktop needs the landing URL. Rollback: disable register and restore the password overlay.

## Open Questions

None.
