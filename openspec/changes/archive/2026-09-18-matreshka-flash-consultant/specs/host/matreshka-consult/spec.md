## Purpose

Gives Matrena Host tools that call the Matreshka consult and tool-select APIs with the session token, so the operator still chats only with Matrena.

## ADDED Requirements

### Requirement: Consult tool uses the session origin

The Host MUST register a consult tool that posts to `{apiOrigin}/v1/consult` with `Authorization: Bearer` of the stored Matreshka session token. The tool MUST send only `goal`, `question`, and optional `plan` and `evidence`. It MUST NOT send the OpenRouter key or the full session transcript.

#### Scenario: Consult after sign-in

- **WHEN** a signed-in session invokes the consult tool with a short question
- **THEN** the Host posts to `{apiOrigin}/v1/consult` with the session bearer and returns the JSON `verdict` and `detail` as the tool result

#### Scenario: No session

- **WHEN** no Matreshka session token is stored
- **THEN** the consult tool does not call OpenRouter and reports that sign-in is required

### Requirement: Tool-select tool uses the session origin

The Host MUST register a tool-select tool that posts to `{apiOrigin}/v1/tools/select` with the session bearer and the current allowlisted tool names as `candidates`. The result MUST be one candidate name plus confidence.

#### Scenario: Select after sign-in

- **WHEN** a signed-in session invokes tool-select with a goal
- **THEN** the Host posts to `{apiOrigin}/v1/tools/select` and the tool result names one of the posted candidates

### Requirement: Matrena stays the chat model

The picker and chat completions path MUST still use public model id `matrena`. Consult and tool-select MUST NOT appear as models.

#### Scenario: Chat model unchanged

- **WHEN** the operator sends a message
- **THEN** the chat request `model` is `matrena` and not `deepseek/deepseek-v4.1-flash` or `typesafe/jev-1.13`
