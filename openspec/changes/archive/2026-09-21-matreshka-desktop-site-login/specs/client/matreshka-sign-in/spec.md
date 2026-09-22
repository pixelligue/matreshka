## MODIFIED Requirements

### Requirement: Blocking sign-in screen

Until a valid Matreshka session exists, the GUI MUST show a full-viewport sign-in page with the Matreshka mark and the title Matreshka. The page MUST cover the viewport so application chrome is not visible behind it, including when the current chat session is not blank. The sign-in occupant MUST live on `shell.overlay`. The application root MUST stay inert. There is no "configure later" that skips sign-in. While the overlay is still deciding whether a session exists, it MUST paint nothing and MUST NOT mark the root inert.

Desktop MUST NOT collect email or password. It MUST offer a control that opens the public site login with a desktop handoff. The web GUI without the Desktop auth bridge, or Desktop with `MATRESHKA_LOCAL_LOGIN=1`, MUST keep email and password fields that post `POST {apiOrigin}/v1/auth/login`.

#### Scenario: First launch without a session

- **WHEN** the GUI loads and no Matreshka session credential is stored
- **THEN** the sign-in page fills the viewport and the rest of the app cannot be used

#### Scenario: Submit calls login

- **WHEN** the web GUI or Desktop with local login forced submits a valid email and password
- **THEN** the client sends `POST {apiOrigin}/v1/auth/login` with JSON `{ "email", "password" }` and on 200 stores the returned `token` as the Matreshka session credential and dismisses the page

#### Scenario: Packaged Desktop opens the site

- **WHEN** Desktop has no session and the operator activates the website sign-in control
- **THEN** the overlay does not post a password to the API and the Desktop shell opens the landing login URL with a desktop handoff

#### Scenario: Invalid credentials stay on the page

- **WHEN** local login returns 401
- **THEN** the page remains, shows locale-owned error copy, and does not store a token

#### Scenario: Desktop receives a one-time code

- **WHEN** Desktop is waiting for sign-in and the shell delivers a one-time code
- **THEN** the client posts `/v1/auth/exchange` with that code and on 200 stores the returned token and dismisses the page
