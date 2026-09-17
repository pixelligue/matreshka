## MODIFIED Requirements

### Requirement: Configurable API origin

The Matreshka API origin MUST be a Host config field with default `http://127.0.0.1:8016`. It MUST NOT be compiled in as a secret. Sign-in MUST read that field. When the field is the default, model calls MUST use `{apiOrigin}/v1` as the OpenAI-compatible base URL.

#### Scenario: Default origin

- **WHEN** the operator has not overridden the origin
- **THEN** sign-in and model calls use `http://127.0.0.1:8016`

#### Scenario: Overridden origin

- **WHEN** the Host config field is set to a different origin
- **THEN** sign-in posts login to `{apiOrigin}/v1/auth/login`
