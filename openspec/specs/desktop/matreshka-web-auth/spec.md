# desktop/matreshka-web-auth Specification

## Purpose

Lets Matreshka Desktop open the public site for sign-in and receive a one-time auth code through the `matreshka://` OS protocol without collecting a password in the app.

## Requirements

### Requirement: Open the website login

Desktop MUST open the public landing register URL with the desktop handoff query in the operator's browser when the sign-in overlay asks to sign in through the site. Local email/password in Desktop is only allowed when `MATRESHKA_LOCAL_LOGIN=1`.

#### Scenario: Website sign-in control

- **WHEN** Desktop activates website sign-in
- **THEN** the shell opens an http(s) landing register URL that includes the desktop handoff query

### Requirement: Receive matreshka:// auth codes

Desktop MUST register the OS protocol `matreshka`. A URL `matreshka://auth?code=` MUST deliver that code to the renderer sign-in overlay. A second-instance launch carrying that URL MUST focus the existing app and deliver the code there.

#### Scenario: Protocol URL while running

- **WHEN** a `matreshka://auth?code=` URL reaches a running Desktop instance
- **THEN** that instance stays unique, the primary window is focused, and the sign-in overlay receives the code
