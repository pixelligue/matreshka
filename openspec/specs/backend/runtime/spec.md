# backend/runtime Specification

## Purpose

Provides the Matreshka HTTP API process and its local Postgres and Redis dependencies so operators can boot a self-contained development backend without touching the DeepSeek Harness packages.

## Requirements

### Requirement: Isolated backend tree

The backend MUST live under the repository root directory `backend/` and MUST NOT join the pnpm workspace, Cordis plugin graph, or the existing `python/` SDK tree.

#### Scenario: Workspace isolation

- **WHEN** an operator inspects `pnpm-workspace.yaml` and the backend tree
- **THEN** no workspace glob includes `backend/` and no backend package is named `@deepseek-ai/*`

### Requirement: Local datastore compose

Local development MUST start PostgreSQL and Redis from a Compose file in `backend/`. The API process MUST read connection URLs from environment variables, not hardcoded hosts.

#### Scenario: Compose brings up datastores

- **WHEN** an operator runs the documented Compose command from `backend/`
- **THEN** PostgreSQL and Redis accept connections on the published development ports

#### Scenario: Missing configuration fails loud

- **WHEN** the API process starts without a required database or Redis URL
- **THEN** it exits with a non-zero status and names the missing variable

### Requirement: Liveness endpoint

The API MUST expose `GET /health` without authentication. A successful response MUST report that the process is up and that it can reach PostgreSQL and Redis.

#### Scenario: Healthy stack

- **WHEN** Postgres and Redis are reachable and a client calls `GET /health`
- **THEN** the response status is 200

#### Scenario: Datastore down

- **WHEN** Postgres or Redis is unreachable and a client calls `GET /health`
- **THEN** the response status is 503

### Requirement: Upstream LLM credentials

The API process MUST read `LLM_UPSTREAM_BASE_URL` and `LLMTOKENAPI_API_KEY` from the environment. Both MUST be non-empty. The process MUST NOT hardcode the key or a live LLMTOKENAPI hostname as a secret. The key MUST NOT be written to logs.

#### Scenario: Missing upstream configuration fails loud

- **WHEN** the API process starts without `LLM_UPSTREAM_BASE_URL` or `LLMTOKENAPI_API_KEY`
- **THEN** it exits with a non-zero status and names the missing variable

#### Scenario: Health does not call the upstream

- **WHEN** Postgres and Redis are reachable and a client calls `GET /health`
- **THEN** the response is 200 even if the upstream model host is down

### Requirement: Local API listen port

The documented local API start MUST bind the HTTP process to loopback port 8016 so it matches the Host default origin `http://127.0.0.1:8016`.

#### Scenario: Documented start uses 8016

- **WHEN** an operator follows the backend README start command
- **THEN** the listed command binds port 8016
