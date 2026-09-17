## Purpose

Routes Host model calls through the Matreshka backend OpenAI-compatible API using the signed-in session token, so the desktop never holds the Gonka key.

## ADDED Requirements

### Requirement: Session-token provider route

After a Matreshka session token is stored, the Host MUST register an llm-pi-ai route with `api: openai-completions` and `baseURL` `{apiOrigin}/v1`. The credential for that route MUST be the session token. The Gonka upstream key MUST NOT be written to desktop credentials.

#### Scenario: Chat uses allowlisted model ids

- **WHEN** a signed-in session sends a model request
- **THEN** the request goes to `{apiOrigin}/v1/chat/completions` with `Authorization: Bearer <session token>` and `model` is `matrena`

#### Scenario: No session means no model call

- **WHEN** no Matreshka session token is stored
- **THEN** the Host does not send a model request to the Matreshka API

### Requirement: Configurable API origin

The Matreshka API origin MUST be a Host config field with default `http://127.0.0.1:8016`. It MUST NOT be compiled in as a secret.

#### Scenario: Default origin

- **WHEN** the operator has not overridden the origin
- **THEN** sign-in and model calls use `http://127.0.0.1:8016`
