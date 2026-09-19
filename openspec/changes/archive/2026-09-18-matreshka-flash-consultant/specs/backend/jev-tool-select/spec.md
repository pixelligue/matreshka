## Purpose

Lets a signed-in Matreshka session ask TypeSafe Jev, through OpenRouter Decisions, to pick one allowlisted tool name without generating prose or exposing OpenRouter credentials to the desktop.

## ADDED Requirements

### Requirement: Authenticated tool select

`POST /v1/tools/select` MUST require a bearer session. The JSON body MUST include string `goal` and a non-empty `candidates` array of tool name strings. The API MUST call OpenRouter Decisions with model `typesafe/jev-1.13` and MUST NOT call chat completions for this path. The OpenRouter key MUST NOT appear in the client response.

#### Scenario: Unauthenticated select

- **WHEN** a client posts `/v1/tools/select` without a valid bearer token
- **THEN** the response is 401 and OpenRouter is not contacted

#### Scenario: Authenticated select

- **WHEN** a client with a valid token posts `{ "goal": "edit the file", "candidates": ["read_file", "apply_patch", "shell"] }`
- **THEN** the API returns 200 JSON whose `tool` is one of the posted `candidates` and whose `confidence` is a number in 0..1

#### Scenario: Empty candidates

- **WHEN** a client with a valid token posts `candidates` `[]`
- **THEN** the response is 400 and OpenRouter is not contacted

### Requirement: Hard input cap

The concatenated select text (goal plus candidate names) MUST be rejected when it exceeds 16,000 UTF-8 bytes. Oversized bodies MUST return 400 without calling OpenRouter.

#### Scenario: Oversized goal rejected

- **WHEN** a client with a valid token posts a `goal` that pushes the concatenated body over 16,000 UTF-8 bytes
- **THEN** the response is 400 and OpenRouter is not contacted

### Requirement: Missing key and upstream failure

When `OPENROUTER_API_KEY` is unset, select MUST return 503. When OpenRouter is unreachable or returns 4xx/5xx, select MUST return 502. The body MUST NOT contain the key.

#### Scenario: Missing key

- **WHEN** `OPENROUTER_API_KEY` is blank
- **THEN** a valid select returns 503

#### Scenario: OpenRouter 5xx

- **WHEN** OpenRouter Decisions returns 500
- **THEN** the client receives 502 and the body does not contain the key
