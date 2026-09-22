# Proposal

## Why

Operators cannot create an account themselves, and Desktop collects email and password in-app. Registration and login should live on the public site. The packaged app should only open that site and receive a session. Unpackaged Desktop keeps the current local form for development.

## What Changes

- HTTP registration on the Matreshka API (`POST /v1/auth/register`). CLI `create-user` remains.
- After website login or register with `next=desktop`, the API mints a one-time desktop code. The site opens `matreshka://auth?code=…`. Desktop exchanges the code for its own session token.
- Packaged Desktop sign-in overlay has no password fields: a control that opens the site. Unpackaged Desktop (and the web GUI without the Desktop auth bridge) keep email/password.
- Landing adds `/login` and `/register` (English `/en/login`, `/en/register`).

## Non-goals

- No email verification, password reset, OAuth, or magic links.
- No website-only product (Desktop is still the app).
- No NestJS/waitlist service.
- No change to chat, plugins, or Matrena routing.

## Capabilities

### New Capabilities

- `desktop/matreshka-web-auth`: OS protocol `matreshka://` and opening the landing login URL from packaged Desktop.

### Modified Capabilities

- `backend/auth`: public register; one-time desktop code; exchange issues a Desktop session. Operator CLI create remains.
- `client/matreshka-sign-in`: packaged Desktop uses website handoff; local email/password stays for unpackaged Desktop and the web GUI.
- `web/matreshka-landing`: login and register pages; desktop handoff after success when `next=desktop`.

## Impact

- **Upstream seams:** `backend/` auth, `apps/landing`, `apps/desktop` (protocol + IPC), `packages/client/ui-settings-models` sign-in overlay.
- Token in the custom-protocol URL is a one-time code, not the session bearer.
