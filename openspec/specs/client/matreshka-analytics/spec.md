# client/matreshka-analytics Specification

## Purpose

Records named Matreshka GUI actions as Aptabase events through the Desktop track bridge, without sending account or conversation content.

## Requirements

### Requirement: Named UI events

When the Desktop analytics bridge is present, the client MUST track these events and no others:

- `ui_sign_in` after login stores a session token
- `ui_sign_out` when Sign out runs
- `ui_settings_open` when Settings opens
- `ui_new_session` when the operator starts a new session from chrome
- `ui_send` when the operator submits the composer
- `ui_web_search` when the operator turns on or invokes the web-search chrome control

Each call MUST use only the event name, with no email, token, prompt, path, or message text in properties.

#### Scenario: Successful sign-in

- **WHEN** login returns 200 and the client stores the session token
- **THEN** the client tracks `ui_sign_in` with no properties

#### Scenario: Composer send

- **WHEN** the operator submits a composer message
- **THEN** the client tracks `ui_send` and the payload does not include the message text

### Requirement: Bridge optional

When `dshDesktop.analytics.track` is missing (web GUI or tests without the Desktop preload), the client MUST skip tracking and MUST NOT throw. The client MUST NOT POST to Aptabase itself and MUST NOT embed an App Key.

#### Scenario: Web GUI without Desktop

- **WHEN** the same client plugin runs in the web profile with no `dshDesktop.analytics`
- **THEN** sign-in, send, and sign-out still work and no Aptabase request is made from the renderer
