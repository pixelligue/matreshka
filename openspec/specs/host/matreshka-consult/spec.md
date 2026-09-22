# host/matreshka-consult Specification

## Purpose
Gives Matrena Host tools that call the Matreshka consult and tool-select APIs with the session token, and asks Jev whether Flash should judge the user request, so the operator still chats only with Matrena.

## Requirements

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

### Requirement: Jev gates the advisor on the user request

On the first step of a turn that admits user-authored text, Host MUST ask Jev, via `POST {apiOrigin}/v1/tools/select` with the session bearer, to choose `skip`, `proceed`, or `consult` for that text. Host MUST NOT send the OpenRouter key. When Jev returns `skip` or `proceed`, Host MUST NOT call `/v1/consult`. When Jev returns `consult`, Host MUST call `/v1/consult` with a short goal and question derived from the user text and MUST append a logged plugin user notice that contains the verdict and detail so Matrena sees it. Later steps in the same turn MUST NOT repeat this gate. If Jev or consult fails, the turn MUST continue without blocking chat.

#### Scenario: Greeting skips Flash

- **WHEN** the operator sends a greeting and Jev chooses `skip`
- **THEN** Host does not post `/v1/consult` and does not append an advisor notice

#### Scenario: Simple task proceeds without Flash

- **WHEN** the operator sends one clear straightforward task and Jev chooses `proceed`
- **THEN** Host does not post `/v1/consult` and does not append an advisor notice

#### Scenario: Hard request consults Flash

- **WHEN** the operator sends a messy or risky task and Jev chooses `consult`
- **THEN** Host posts `/v1/consult` with the session bearer and appends a plugin notice that includes the Flash `verdict`

#### Scenario: Gate failure does not block chat

- **WHEN** Jev or consult returns an error
- **THEN** the turn still enters and chat completions still use `matrena`
