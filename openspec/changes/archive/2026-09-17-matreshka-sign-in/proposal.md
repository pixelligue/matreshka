## Why

The GUI still onboards with a DeepSeek API key and DeepSeek Harness marks. Matreshka is the company product: users sign in with email/password against our backend, see a Matreshka mark, and call models only through that backend. The Gonka key must stay on the server.

## What Changes

- Replace the first-run DeepSeek API-key onboarding step with a blocking Matreshka sign-in that fills the viewport (not a floating dialog over the app): logo, product name, email, password, submit. Success calls `POST /v1/auth/login` and stores the bearer token as a Host credential.
- Show a Matreshka nesting-doll mark and the name "Matreshka" in the sidebar brand slots (all client builds, not only `official`).
- After a valid session, the Host serves models through `dsh-llm-pi-ai` with `api: openai-completions`, `baseURL` the Matreshka API `/v1`, and the session token as the credential. Allowlisted model ids match the backend.
- Locale-owned copy for the new screen (en, ru, zh). Existing npm package names stay `@deepseek-ai/dsh-*`.

## Non-goals

- No HTTP signup (backend still has none).
- No rename of npm packages, no rewrite of DSH docs or Agent Notes beyond this product UI.
- No full visual restyle of conversation, settings pages, or the fish hero animation.
- No Gonka key in the desktop.
- `backend-llm-proxy` stays as-is.

## Capabilities

### New Capabilities

- `client/matreshka-sign-in`: blocking email/password gate against the Matreshka API.
- `client/matreshka-brand`: sidebar mark and product name.
- `host/matreshka-models`: session-token LLM route through the Matreshka OpenAI-compatible API.

### Modified Capabilities

- None. Main specs have no client/host capabilities yet.

## Impact

- **Upstream seams:** `packages/client/ui-settings-models` (onboarding), `packages/client/ui-brand-official` (or a Matreshka occupant of `sidebar.brand.*`), Host llm-pi-ai config / credentials. Desktop/web share the client packages.
- New web snapshots for the full-page sign-in. `verify-client-ui-i18n` must pass.
- Configurable API origin (default `http://127.0.0.1:8016`) as a Host config field, not a hardcoded secret.
