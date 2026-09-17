## Purpose

Serves an authenticated OpenAI Chat Completions SSE stream whose framing matches the fork's existing parsers, so a later provider change can replace fixture tokens without changing the desktop adapter protocol.

## ADDED Requirements

### Requirement: OpenAI chat completions path

The API MUST accept `POST /v1/chat/completions` with JSON that includes `model` and `messages`. The endpoint MUST be protected by a bearer session. This change MUST stream fixture assistant text and MUST NOT call an upstream model provider.

#### Scenario: Unauthenticated chat

- **WHEN** a client posts `/v1/chat/completions` without a valid bearer token
- **THEN** the response is 401 and no SSE body is sent

#### Scenario: Authenticated fixture stream

- **WHEN** a client with a valid token posts `{ "model": "matreshka-stub", "messages": [{ "role": "user", "content": "hi" }], "stream": true }`
- **THEN** the response is 200 with `Content-Type` starting with `text/event-stream` and the body contains at least one visible-text delta

### Requirement: SSE framing compatible with the fork

Each event MUST be a complete SSE record: `data: <payload>` followed by a blank-line terminator (`\n\n`). JSON payloads MUST parse as OpenAI `chat.completion.chunk` objects with `choices[].delta`. Visible text MUST appear in `choices[0].delta.content`. The stream MUST end with a payload whose data is the literal string `[DONE]` (not JSON) and that event MUST include the blank-line terminator. Keep-alive comments (`: ...`) MAY appear and MUST NOT replace `[DONE]`.

#### Scenario: Terminating DONE

- **WHEN** a fixture stream finishes successfully
- **THEN** the last dispatched SSE data payload is `[DONE]` including its blank-line terminator

#### Scenario: Chunk shape

- **WHEN** a client reads a non-DONE data payload
- **THEN** it is JSON with `choices` and a `delta` object, and at least one chunk has a string `choices[0].delta.content`

### Requirement: Stream flag

When `stream` is true or omitted, the API MUST use the SSE framing above. When `stream` is false, the API MUST return `400` in this change (non-stream JSON completions are out of scope).

#### Scenario: Non-stream rejected

- **WHEN** a client posts `stream: false` with a valid token
- **THEN** the response is 400
