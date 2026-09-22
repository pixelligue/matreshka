## Purpose

Proxies OpenRouter image generation and editing with a session bearer so Desktop never holds the OpenRouter key. Jev picks the model.

## ADDED Requirements

### Requirement: Authenticated image generate

`POST /v1/images/generate` MUST require a bearer session. JSON MUST include `prompt`. It MAY include `n` (1–10), `model` (`gpt-image-2`, `qwen-image-3`, `grok-imagine-image-2.0`), `aspectRatio`, and `references` (base64 images). When `model` is omitted, the API MUST ask Jev to choose among those three ids and MUST default to `gpt-image-2` if Jev fails. `gpt-image-2` MUST be requested at quality `low`. The OpenRouter key MUST NOT appear in the response. The body MUST include `{ "model": string, "images": [ { "b64": string, "mediaType": string } ] }`.

#### Scenario: Unauthenticated generate

- **WHEN** a client posts `/v1/images/generate` without a valid bearer
- **THEN** the response is 401 and OpenRouter is not contacted

#### Scenario: Jev picks a model

- **WHEN** a signed-in client posts a prompt without `model`
- **THEN** the API asks Jev among `gpt-image-2`, `qwen-image-3`, and `grok-imagine-image-2.0` and generates with the chosen slug (or `gpt-image-2` on Jev failure)

### Requirement: Edit uses references

When `references` is present, the API MUST send them as OpenRouter `input_references` with the prompt as the edit instruction.

#### Scenario: Edit with a reference

- **WHEN** a signed-in client posts a prompt and one reference image
- **THEN** OpenRouter is called with `input_references` and the response contains at least one image
