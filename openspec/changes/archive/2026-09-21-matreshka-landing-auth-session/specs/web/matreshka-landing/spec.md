## ADDED Requirements

### Requirement: Browser session persistence

Successful login or register MUST store the session bearer in the browser so a later load of the login or register page still shows the visitor as signed in. Sign out MUST clear that stored session.

#### Scenario: Refresh keeps the visitor signed in

- **WHEN** a visitor registers or logs in and then reloads the login or register page
- **THEN** they see the signed-in state and not an empty email/password form

#### Scenario: Sign out forgets the site session

- **WHEN** a signed-in visitor activates sign out
- **THEN** the login or register form is shown again and a reload does not restore the previous session

## MODIFIED Requirements

### Requirement: Desktop handoff after website auth

When the login or register page is opened with a desktop handoff query, a successful login or register MUST mint a one-time desktop code and MUST navigate to the Matreshka desktop auth URL with that code. The page MUST NOT put the session bearer in that URL. If a stored site session already exists, the page MUST mint a code and hand off without asking for a password again.

#### Scenario: Login with desktop next

- **WHEN** a visitor submits valid credentials on login with the desktop handoff query
- **THEN** the page requests a one-time code with the session bearer and navigates to `matreshka://auth` with that code

#### Scenario: Stored session hands off to Desktop

- **WHEN** a visitor with a stored site session opens login or register with the desktop handoff query
- **THEN** the page mints a one-time code without a new password form and navigates to `matreshka://auth`
