## 1. Operator Aptabase stack

- [x] 1.1 Add `ops/aptabase/docker-compose.yml` (Postgres 15, ClickHouse 23.8, `ghcr.io/aptabase/aptabase` on host port 8000) and `ops/aptabase/README.md` covering register, log activation link, `A-SH-` App Key, `MATRESHKA_APTABASE_APP_KEY` / `MATRESHKA_APTABASE_HOST`, Debug mode, and the 10s ClickHouse flush, and verify the README names port 8000, Debug, and ten seconds
- [x] 1.2 Smoke the compose file with `docker compose -f ops/aptabase/docker-compose.yml up -d` and verify `http://127.0.0.1:8000` serves the Aptabase UI (or record the blocker if Docker is unavailable)

## 2. Desktop ingest and allowlist

- [x] 2.1 Add a Desktop-owned Aptabase POST helper (Electron `net`, session id, `systemProps`, no `aptabase-ipc` and no `@aptabase/electron` `initialize`) that reads `MATRESHKA_APTABASE_APP_KEY` / `MATRESHKA_APTABASE_HOST` (default `http://127.0.0.1:8000`), and verify a unit test that a missing key sends no HTTP and an `A-SH-` key posts to `{host}/api/v0/event` with `App-Key`
- [x] 2.2 Enforce the event allowlist and drop unknown names, unknown keys, email/token/path/message-like values, and verify tests that `button_click` is not sent, `ui_sign_in` plus `{ email: "op@localhost" }` does not include the address, unpackaged `isDebug` is true, and packaged is false
- [x] 2.3 Track `app_started` once after the main window is created when configured, track packaged `update_check` (`outcome`) and `update_install` (`version`), and verify tests that startup emits `app_started` and the update coordinator emits the two update events without changing decline-does-not-install behavior

## 3. Renderer bridge

- [x] 3.1 Expose fire-and-forget `dshDesktop.analytics.track` on `dsh-app://app/` via preload IPC to the allowlist, never returning the App Key, and verify `preload-app` tests that app documents get `analytics.track` and still do not get plugin/update privileged APIs
- [x] 3.2 Confirm `protocol.registerSchemesAsPrivileged` still lists only `dsh-app` and verify a test or grep that `aptabase-ipc` is not registered

## 4. Client named events

- [x] 4.1 Add a tiny optional `track(name)` helper that calls `window.dshDesktop?.analytics?.track` and no-ops when missing, and verify a unit test that a missing bridge does not throw and does not fetch Aptabase
- [x] 4.2 Track `ui_sign_in` after login stores the token and `ui_sign_out` from `performSignOut` with no properties, and verify client tests still cover 200/401 and that the track helper is invoked with only those names
- [x] 4.3 Track `ui_settings_open`, `ui_new_session`, `ui_send` (no message text), and `ui_web_search` on the existing chrome controls, and verify client tests that those actions call `track` with the catalog names and no prompt/email payload

## 5. Local end-to-end check

- [x] 5.1 With compose up, App Key set, and unpackaged Desktop, sign in, send, open Settings, and confirm Aptabase Debug Live View shows `app_started` plus the matching `ui_*` events after ≥10s, and verify OS/version widgets are populated
