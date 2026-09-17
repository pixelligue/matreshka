## Why

Sign-in stores a session with no way to revoke it from the GUI. Fetch still uses anonymous HTTP while search already uses Keenable's public index. Matreshka keeps a single model (`matrena`).

## What Changes

- `POST /v1/auth/logout` with a bearer token deletes the Redis session (idempotent if the token is already gone). The GUI Sign out control in Settings → General clears `MATRESHKA_SESSION_TOKEN` and returns the operator to the blocking sign-in page.
- Register a `keenable` `ctx.web` fetch provider that calls Keenable `GET /v1/fetch/public` with `X-Keenable-Title: Matreshka` and no API key. Matreshka web/desktop default `fetchProvider` becomes `keenable`. `web-fetch-http` stays registered but is not the default.

## Non-goals

- No extra models. `matrena` remains the only picker id.
- No signup. No Keenable API key. No LLMTOKENAPI fetch.
- No changing search defaults (Keenable search stays default).

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `backend/auth`: logout route.
- `client/matreshka-sign-in`: Sign out returns to the blocking page.
- `host/matreshka-web-search`: Keenable fetch is the default fetch provider.

## Impact

- **Upstream seams:** `backend/` auth; `packages/client/ui-settings-models` (Sign out row + copy); `packages/web/web-search-matreshka` (fetch); `packages/bundle/web-app/cordis.patch.yml`.
