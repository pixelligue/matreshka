## MODIFIED Requirements

### Requirement: Allowlisted models

The API MUST accept only the public id `matrena`. It MUST map that id to the LLMTOKENAPI catalog id `deepseek-ai-deepseek-v4-flash-0731`. Vendor ids and other catalog ids MUST return 400 without calling the upstream. SSE chunks returned to the client MUST use `model` `matrena`. The upstream request MUST use `Authorization: Bearer` with `LLMTOKENAPI_API_KEY` and MUST NOT include that key in the client body.

#### Scenario: Unknown model rejected

- **WHEN** a client with a valid token posts `model` `matreshka-stub` or any id outside the allowlist
- **THEN** the response is 400 and the upstream is not contacted

#### Scenario: Catalog id rejected

- **WHEN** a client with a valid token posts `deepseek-ai-deepseek-v4-flash-0731`
- **THEN** the response is 400 and the upstream is not contacted

#### Scenario: Vendor id rejected

- **WHEN** a client with a valid token posts the upstream vendor model id
- **THEN** the response is 400 and the upstream is not contacted
