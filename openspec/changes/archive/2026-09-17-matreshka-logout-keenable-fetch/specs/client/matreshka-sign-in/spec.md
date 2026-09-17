## ADDED Requirements

### Requirement: Sign out returns to sign-in

Settings → General MUST offer a Sign out control whose copy is locale-owned. Activating it MUST call `POST {apiOrigin}/v1/auth/logout` with the stored bearer token (best-effort), MUST remove the Matreshka session credential, and MUST return the operator to the blocking sign-in page.

#### Scenario: Sign out clears the session

- **WHEN** a signed-in operator activates Sign out
- **THEN** the session credential is removed and the sign-in page covers the viewport again
