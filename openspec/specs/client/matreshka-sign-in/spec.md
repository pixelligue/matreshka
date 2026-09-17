# client/matreshka-sign-in Specification

## Purpose

Blocks first use of the Matreshka GUI until the operator signs in with email and password against the product API, then stores the session token for model calls.

## Requirements

### Requirement: Blocking sign-in screen

Until a valid Matreshka session exists, the GUI MUST show a full-viewport sign-in page with the Matreshka mark, the title Matreshka, email and password fields, and a submit control. The page MUST cover the viewport so application chrome is not visible behind it. The application root MUST stay inert. There is no "configure later" that skips sign-in. There is no sign-up control. While the step is still deciding whether a session exists, it MUST paint nothing and MUST NOT mark the root inert.

#### Scenario: First launch without a session

- **WHEN** the GUI loads and no Matreshka session credential is stored
- **THEN** the sign-in page fills the viewport and the rest of the app cannot be used

#### Scenario: Submit calls login

- **WHEN** the operator submits a valid email and password
- **THEN** the client sends `POST {apiOrigin}/v1/auth/login` with JSON `{ "email", "password" }` and on 200 stores the returned `token` as the Matreshka session credential and dismisses the page

#### Scenario: Invalid credentials stay on the page

- **WHEN** login returns 401
- **THEN** the page remains, shows locale-owned error copy, and does not store a token

### Requirement: Locale-owned copy

All product-visible strings on the sign-in page MUST come from the feature locale dictionaries (English, Russian, and Chinese). Hardcoded UI sentences are forbidden.

#### Scenario: Title is localized

- **WHEN** the sign-in page is shown
- **THEN** its accessible name is the locale string for the Matreshka sign-in title, not a DeepSeek API-key title

### Requirement: Sign out returns to sign-in

Settings → General MUST offer a Sign out control whose copy is locale-owned. Activating it MUST call `POST {apiOrigin}/v1/auth/logout` with the stored bearer token (best-effort), MUST remove the Matreshka session credential, and MUST return the operator to the blocking sign-in page.

#### Scenario: Sign out clears the session

- **WHEN** a signed-in operator activates Sign out
- **THEN** the session credential is removed and the sign-in page covers the viewport again
