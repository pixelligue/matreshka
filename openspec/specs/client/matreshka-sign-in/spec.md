# client/matreshka-sign-in Specification

## Purpose

Blocks first use of the Matreshka GUI until a session exists: Desktop through the public site, the web GUI (or `MATRESHKA_LOCAL_LOGIN=1`) through email and password.

## Requirements

### Requirement: Blocking sign-in screen

Until a valid Matreshka session exists, the GUI MUST show a full-viewport sign-in page with the Matreshka mark and the title Matreshka. The page MUST cover the viewport so application chrome is not visible behind it, including when the current chat session is not blank. The sign-in occupant MUST live on `shell.overlay`. The application root MUST stay inert. There is no "configure later" that skips sign-in. While the overlay is still deciding whether a session exists, it MUST paint nothing and MUST NOT mark the root inert.

Desktop MUST NOT collect email or password. It MUST offer a control that opens the public site with a desktop handoff. The web GUI without the Desktop auth bridge, or Desktop with `MATRESHKA_LOCAL_LOGIN=1`, MUST keep email and password fields that post `POST {apiOrigin}/v1/auth/login`.

#### Scenario: First launch without a session

- **WHEN** the GUI loads and no Matreshka session credential is stored
- **THEN** the sign-in page fills the viewport and the rest of the app cannot be used

#### Scenario: Submit calls login

- **WHEN** the web GUI or Desktop with local login forced submits a valid email and password
- **THEN** the client sends `POST {apiOrigin}/v1/auth/login` with JSON `{ "email", "password" }` and on 200 stores the returned `token` as the Matreshka session credential and dismisses the page

#### Scenario: Packaged Desktop opens the site

- **WHEN** Desktop has no session and the operator activates the website sign-in control
- **THEN** the overlay does not post a password to the API and the Desktop shell opens the landing register URL with a desktop handoff

#### Scenario: Invalid credentials stay on the page

- **WHEN** local login returns 401
- **THEN** the page remains, shows locale-owned error copy, and does not store a token

#### Scenario: Desktop receives a one-time code

- **WHEN** Desktop is waiting for sign-in and the shell delivers a one-time code
- **THEN** the client posts `/v1/auth/exchange` with that code and on 200 stores the returned token and dismisses the page

### Requirement: Locale-owned copy

All product-visible strings on the sign-in page MUST come from the feature locale dictionaries (English, Russian, and Chinese). Hardcoded UI sentences are forbidden.

#### Scenario: Title is localized

- **WHEN** the sign-in page is shown
- **THEN** its accessible name is the locale string for the Matreshka sign-in title, not a DeepSeek API-key title

### Requirement: Sign out returns to sign-in

Settings → General and the sidebar footer MUST offer a Sign out control whose copy is locale-owned. Activating it MUST call `POST {apiOrigin}/v1/auth/logout` with the stored bearer token (best-effort), MUST remove the Matreshka session credential, and MUST return the operator to the blocking sign-in page even if the current chat session is not blank.

#### Scenario: Sign out clears the session

- **WHEN** a signed-in operator activates Sign out
- **THEN** the session credential is removed and the sign-in page covers the viewport again

#### Scenario: Sign out from a filled chat session

- **WHEN** a signed-in operator activates Sign out while viewing a non-blank chat
- **THEN** the sign-in page covers the viewport again without requiring an empty-hero onboarding step
