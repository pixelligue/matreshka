# desktop/aptabase-analytics Specification

## Purpose

Sends allowlisted Desktop product events to a self-hosted Aptabase instance so operators can see DAU, OS, app version, and named lifecycle usage without capturing session content.

## Requirements

### Requirement: Direct Aptabase ingest

When `MATRESHKA_APTABASE_APP_KEY` is a self-hosted App Key (`A-SH-` prefix) and a host is configured, Desktop MUST POST each accepted event to `{host}/api/v0/event` with header `App-Key` and a JSON body that includes `eventName`, `timestamp`, `sessionId`, `systemProps`, and optional `props`. The default host is `http://127.0.0.1:8000`. Desktop MUST NOT send events through the Matreshka FastAPI origin. Desktop MUST NOT register an `aptabase-ipc` protocol scheme.

#### Scenario: Configured process posts to Aptabase

- **WHEN** the App Key is `A-SH-` prefixed and the host is `http://127.0.0.1:8000`
- **THEN** an accepted event is POSTed to `http://127.0.0.1:8000/api/v0/event` with that App Key header

#### Scenario: Missing key disables tracking

- **WHEN** `MATRESHKA_APTABASE_APP_KEY` is unset or empty
- **THEN** Desktop sends no Aptabase HTTP request and still launches

### Requirement: System properties on every event

Every accepted event MUST include `systemProps` with OS name, OS version, locale, app version, engine name `Chromium`, engine version, SDK identifier, and `isDebug` true when the process is unpackaged and false when packaged. Custom `props` MUST be only strings or numbers.

#### Scenario: Unpackaged is debug

- **WHEN** an unpackaged Desktop process sends `app_started`
- **THEN** the body has `systemProps.isDebug` true and a non-empty `appVersion` and `osName`

#### Scenario: Packaged is release

- **WHEN** a packaged Desktop process sends `app_started`
- **THEN** the body has `systemProps.isDebug` false

### Requirement: Event allowlist

Desktop MUST accept only these event names: `app_started`, `update_check`, `update_install`, `ui_sign_in`, `ui_sign_out`, `ui_settings_open`, `ui_new_session`, `ui_send`, `ui_web_search`. Allowed custom property keys are `outcome` on `update_check` (`available`, `none`, or `error`) and `version` on `update_install` (the offered version string). Desktop MUST drop unknown names, unknown keys, and any value that looks like email, a bearer token, a filesystem path, or message text. Tracking MUST NOT throw into the UI.

#### Scenario: Unknown name is dropped

- **WHEN** the renderer asks to track `button_click` with `{ label: "Send" }`
- **THEN** Desktop sends no Aptabase request

#### Scenario: Email property is dropped

- **WHEN** the renderer asks to track `ui_sign_in` with `{ email: "op@localhost" }`
- **THEN** Desktop either sends `ui_sign_in` with no `email` key or sends nothing; it MUST NOT include the address

### Requirement: Lifecycle events from the shell

Desktop MUST track `app_started` once after the main window is created when tracking is configured. Packaged update checks MUST track `update_check` with `outcome`. Accepting an update MUST track `update_install` with `version`.

#### Scenario: Startup event

- **WHEN** a configured Desktop process creates the main window
- **THEN** it sends `app_started`

### Requirement: Renderer track bridge

Application documents on `dsh-app://app/` MUST receive a fire-and-forget `dshDesktop.analytics.track(name, props?)` that IPC-forwards to the shell allowlist. Shell-only startup pages MUST NOT gain extra privileged desktop APIs beyond this analytics call if they already have startup controls. The bridge MUST NOT return the App Key.

#### Scenario: App document can track a named event

- **WHEN** the application renderer calls `dshDesktop.analytics.track("ui_send")` on a configured process
- **THEN** Desktop POSTs `ui_send` to Aptabase without exposing the App Key to the renderer

### Requirement: Operator local stack

The repository MUST include a Docker Compose file that starts Aptabase with Postgres and ClickHouse and publishes the dashboard on port 8000. README next to that file MUST state: register an account, take the activation link from container logs, create an app, copy the `A-SH-` App Key, set `MATRESHKA_APTABASE_APP_KEY` and `MATRESHKA_APTABASE_HOST`, launch Desktop, switch the dashboard to Debug, and wait at least ten seconds for Live View.

#### Scenario: Compose file exists

- **WHEN** an operator opens `ops/aptabase/`
- **THEN** they find a Compose file that maps host port 8000 to the Aptabase app and a README that names Debug mode and the ten-second ingest delay
