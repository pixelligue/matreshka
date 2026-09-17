## ADDED Requirements

### Requirement: Keenable fetch is the default

The Matreshka web/desktop composition MUST register a `keenable` fetch provider that calls Keenable's public fetch endpoint with `X-Keenable-Title: Matreshka` and MUST NOT send an API key. The default `fetchProvider` MUST be `keenable`. The anonymous HTTP fetch provider MAY remain registered.

#### Scenario: Default fetch is Keenable

- **WHEN** the Matreshka composition loads
- **THEN** `ctx.web` default fetch provider is `keenable`

#### Scenario: Keenable fetch without a key

- **WHEN** the Host fetches a public URL with provider `keenable`
- **THEN** the request is sent to Keenable public fetch with `X-Keenable-Title` and without an Authorization header
