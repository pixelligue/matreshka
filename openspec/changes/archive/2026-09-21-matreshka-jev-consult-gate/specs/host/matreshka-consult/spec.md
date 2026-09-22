## ADDED Requirements

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
