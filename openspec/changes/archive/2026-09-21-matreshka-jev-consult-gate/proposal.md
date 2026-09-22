# Proposal

## Why

Matrena currently decides from a prompt whether to call the Flash advisor. That is easy to skip. Jev already picks among named options through OpenRouter Decisions. The advisor should run only when Jev says the user request needs a consultation.

## What Changes

- On the first step of a turn, Host asks Jev `skip`, `proceed`, or `consult` for the user text (existing `POST /v1/tools/select`).
- `consult` → existing `POST /v1/consult` (Flash). The verdict is appended as a logged plugin user notice so Matrena sees it.
- `skip` and `proceed` → no Flash call and no notice. `proceed` is a clear simple task; `skip` is chit-chat.
- Jev or Flash errors fail open: the turn continues without an advisor.
- Mid-turn `consult` and `select_tool` tools stay. Persona text no longer tells Matrena to skip consult on greetings; Jev owns that gate.

## Non-goals

- No new OpenRouter model. No backend route. Chat model stays `matrena`.
- No email verification, OAuth, or prompt rewrite of the agent loop.
- No forcing consult on every tool follow-up step.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `host/matreshka-consult`: automatic Jev gate on the user request; Flash advisor only when Jev chooses `consult`.

## Impact

- **Upstream seam:** `packages/web/consult-matreshka` (`agent/pre-step`) and `packages/bundle/web-app/cordis.patch.yml` persona prefix.
- OpenRouter key stays on FastAPI. Extra Jev call once per user turn.
