## Purpose

Lets a signed-in Matreshka session ask DeepSeek V4.1 Flash, through OpenRouter, for a short verdict on a hard step without exposing OpenRouter credentials to the desktop.

## ADDED Requirements

### Requirement: Authenticated consult

`POST /v1/consult` MUST require a bearer session. The JSON body MUST include string fields `goal`, `question`, and MAY include `plan` and `evidence`. The API MUST call OpenRouter chat completions with model `deepseek/deepseek-v4.1-flash` and MUST NOT call LLMTOKENAPI for this path. The OpenRouter key MUST NOT appear in the client response.

#### Scenario: Unauthenticated consult

- **WHEN** a client posts `/v1/consult` without a valid bearer token
- **THEN** the response is 401 and OpenRouter is not contacted

#### Scenario: Authenticated consult

- **WHEN** a client with a valid token posts a consult body under the size cap
- **THEN** the API returns 200 JSON with `verdict` one of `ok`, `revise`, `risk` and a short `detail` string, and the upstream model id is `deepseek/deepseek-v4.1-flash`

#### Scenario: Missing OpenRouter key

- **WHEN** `OPENROUTER_API_KEY` is unset or blank
- **THEN** a valid consult returns 503 and OpenRouter is not contacted

### Requirement: Hard input cap

The concatenated consult text MUST be rejected when it exceeds 32,000 UTF-8 bytes. Oversized bodies MUST return 400 without calling OpenRouter.

#### Scenario: Oversized evidence rejected

- **WHEN** a client with a valid token posts `evidence` that pushes the concatenated body over 32,000 UTF-8 bytes
- **THEN** the response is 400 and OpenRouter is not contacted

### Requirement: Upstream failure

When OpenRouter is unreachable or returns 4xx/5xx, the API MUST return 502. The body MUST NOT contain the OpenRouter key.

#### Scenario: OpenRouter 5xx

- **WHEN** OpenRouter returns 500
- **THEN** the client receives 502 and the body does not contain the key
