## ADDED Requirements

### Requirement: Login and register pages

The landing app MUST serve login and register pages at locale-owned paths. Copy MUST come from landing dictionaries. The pages MUST be usable without a Desktop session.

#### Scenario: Visitor opens login

- **WHEN** a visitor opens the Russian login path
- **THEN** they see a Matreshka login form with email and password, not the marketing hero

#### Scenario: Visitor opens register

- **WHEN** a visitor opens the Russian register path
- **THEN** they see a Matreshka registration form with email and password

### Requirement: Desktop handoff after website auth

When the login or register page is opened with a desktop handoff query, a successful login or register MUST mint a one-time desktop code and MUST navigate to the Matreshka desktop auth URL with that code. The page MUST NOT put the session bearer in that URL.

#### Scenario: Login with desktop next

- **WHEN** a visitor submits valid credentials on login with the desktop handoff query
- **THEN** the page requests a one-time code with the session bearer and navigates to `matreshka://auth` with that code
