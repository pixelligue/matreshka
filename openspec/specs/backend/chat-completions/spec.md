# backend/chat-completions Specification

## Purpose

Serves an authenticated OpenAI Chat Completions SSE stream whose framing matches the fork's existing parsers, so a later provider change can replace fixture tokens without changing the desktop adapter protocol.

## Requirements

### Requirement: OpenAI chat completions path

The API MUST accept `POST /v1/chat/completions` with JSON that includes `model` and `messages`. The endpoint MUST be protected by a bearer session. For an allowlisted model the API MUST stream the upstream OpenAI-compatible SSE body to the client. The API MUST NOT serve fixture assistant text. The upstream key MUST NOT appear in the client response or in error bodies.

#### Scenario: Unauthenticated chat

- **WHEN** a client posts `/v1/chat/completions` without a valid bearer token
- **THEN** the response is 401 and no SSE body is sent

#### Scenario: Authenticated fixture stream

- **WHEN** a client with a valid token posts `{ "model": "matrena", "messages": [{ "role": "user", "content": "hi" }], "stream": true }` and the upstream returns SSE
- **THEN** the response is 200 with `Content-Type` starting with `text/event-stream` and the body contains at least one visible-text delta from the upstream (no fixture `matreshka-stub` tokens)

#### Scenario: Upstream failure

- **WHEN** the upstream is unreachable or returns 5xx
- **THEN** the client receives 502 and the body does not contain the upstream API key

### Requirement: SSE framing compatible with the fork

Each event MUST be a complete SSE record: `data: <payload>` followed by a blank-line terminator (`\n\n`). JSON payloads MUST parse as OpenAI `chat.completion.chunk` objects with `choices[].delta`. Visible text MUST appear in `choices[0].delta.content`. The stream MUST end with a payload whose data is the literal string `[DONE]` (not JSON) and that event MUST include the blank-line terminator. Keep-alive comments (`: ...`) MAY appear and MUST NOT replace `[DONE]`. If the upstream omits `[DONE]`, the API MUST append it.

#### Scenario: Terminating DONE

- **WHEN** a proxied stream finishes successfully
- **THEN** the last dispatched SSE data payload is `[DONE]` including its blank-line terminator

#### Scenario: Chunk shape

- **WHEN** a client reads a non-DONE data payload
- **THEN** it is JSON with `choices` and a `delta` object, and at least one chunk has a string `choices[0].delta.content`

### Requirement: Stream flag

When `stream` is true or omitted, the API MUST use the SSE framing above. When `stream` is false, the API MUST return `400` (non-stream JSON completions are out of scope).

#### Scenario: Non-stream rejected

- **WHEN** a client posts `stream: false` with a valid token
- **THEN** the response is 400

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
