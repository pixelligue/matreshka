## MODIFIED Requirements

### Requirement: Open the website login

Desktop MUST open the public landing **register** URL with the desktop handoff query in the operator's browser when the sign-in overlay asks to sign in through the site. Local email/password in Desktop is only allowed when `MATRESHKA_LOCAL_LOGIN=1`.

#### Scenario: Website sign-in control

- **WHEN** Desktop activates website sign-in
- **THEN** the shell opens an http(s) landing register URL that includes the desktop handoff query
