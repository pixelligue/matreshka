## Why

Sign-in and model calls already assume `http://127.0.0.1:8016`, but that origin is a Client constant, `llm-pi-ai` hardcodes the same URL in YAML, and `uv run fastapi dev` still binds FastAPI's default port 8000. Operators cannot point the GUI at the API without editing source, and a default backend start misses the desktop.

## What Changes

- Make the Matreshka API origin a Host composition `config` field on `ui-settings-models` (default `http://127.0.0.1:8016`). Sign-in reads that field instead of a compiled-in constant.
- Keep the `llm-pi-ai` `matreshka` `baseURL` at `{apiOrigin}/v1` for the same default, and fail a composition test if the two drift.
- Document and bind the API process on port 8016 (loopback) so a default local start matches the Host origin.
- **BREAKING (local ops):** the documented `fastapi dev` command uses `--port 8016` instead of FastAPI's 8000 default.

## Non-goals

- No logout, signup, or extra models.
- No new Host package and no rewrite of `dsh-llm-pi-ai`.
- No production TLS, reverse proxy, or remote-origin UI.
- Do not change allowlisted model id `matrena` or session-token routing.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `host/matreshka-models`: origin is a Host config field; an override is used by sign-in; default origin stays `http://127.0.0.1:8016`.
- `backend/runtime`: the documented local API listen port is 8016 on loopback.

## Impact

- **Upstream seams:** `packages/client/ui-settings-models` (Host + Client Config), `packages/bundle/web-app/cordis.patch.yml` (and base `llm-pi-ai` `baseURL`), `backend/README.md` plus the FastAPI/CLI serve command.
- Tests: Client inject uses the config default; composition test keeps sign-in origin and `baseURL` aligned; backend README/CLI names 8016.
