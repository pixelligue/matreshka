## ADDED Requirements

### Requirement: Upstream LLM credentials

The API process MUST read `LLM_UPSTREAM_BASE_URL` and `LLM_UPSTREAM_API_KEY` from the environment. Both MUST be non-empty. The process MUST NOT hardcode the key or the live Gonka hostname in source.

#### Scenario: Missing upstream configuration fails loud

- **WHEN** the API process starts without `LLM_UPSTREAM_BASE_URL` or `LLM_UPSTREAM_API_KEY`
- **THEN** it exits with a non-zero status and names the missing variable

#### Scenario: Health does not call the upstream

- **WHEN** Postgres and Redis are reachable and a client calls `GET /health`
- **THEN** the response is 200 even if the upstream model host is down
