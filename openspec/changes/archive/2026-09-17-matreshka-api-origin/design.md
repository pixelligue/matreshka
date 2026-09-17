## Context

See proposal.md. `host/matreshka-models` already requires a Host `apiOrigin` defaulting to `http://127.0.0.1:8016`. Sign-in injects a Client constant `DEFAULT_MATRESHKA_API_ORIGIN`. `llm-pi-ai` `baseURL` is the same host in YAML. `uv run fastapi dev` binds 8000. **Ownership:** Host composition + Client inject for origin; `backend/` for the listen port.

## Goals / Non-Goals

**Goals:**

- Sign-in origin comes from plugin Config on the Host composition row.
- Default origin and `llm-pi-ai` `baseURL` stay aligned (`{origin}/v1`).
- Documented API start binds 8016 on loopback.

**Non-Goals:**

- Do not add a new Host package or a remote "describe origin" RPC.
- Do not make a single YAML key drive both plugins at runtime (two keys, composition test).

## Decisions

### 1. Reuse the `ui-settings-general` Config pattern

`ui-settings-general` already takes Host composition `config` (`hiddenSectionIds`) on the Client face. Add `apiOrigin` the same way on `@deepseek-ai/dsh-client-ui-settings-models`: Client `Config` schema, web-app row `config.apiOrigin`, `apply(ctx, config)` injects `Config(config).apiOrigin` into the sign-in page.

The Host face (`src/index.ts`) exports the same `apiOrigin` schema so the Loader validates the row on the node half.

Alternative: new Host plugin + RPC — rejected; more packages for one string.

### 2. Keep `llm-pi-ai` `baseURL` as a second YAML key

Model calls already use `baseURL: http://127.0.0.1:8016/v1`. Deriving it from `ui-settings-models` config at runtime would couple the adapter to a UI plugin. A composition test asserts `baseURL === `${apiOrigin}/v1`` for the shipped default. Overriding sign-in origin without changing `llm-pi-ai` is operator error; the spec only requires override to affect sign-in.

### 3. Document `fastapi dev --port 8016`

FastAPI CLI default is 8000. Change the README command to `uv run fastapi dev --port 8016 --host 127.0.0.1`. Do not add a second ASGI server wrapper. A backend test asserts the README contains `--port 8016`.

## Risks / Trade-offs

- **[Risk] Origin and `baseURL` drift on override.** → Composition test covers the shipped default; README notes both keys.
- **[Trade-off] Two YAML keys instead of one.** → Avoids a new Host service; matches existing bundle patches.

## Migration Plan

Local operators who already run `fastapi dev` on 8000 must switch to 8016. No session-format or credential migration.

## Open Questions

None.
