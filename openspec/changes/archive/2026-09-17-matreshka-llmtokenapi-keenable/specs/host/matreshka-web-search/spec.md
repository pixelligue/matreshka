## Purpose

Gives Matreshka desktop and web two `ctx.web` search backends — Keenable (keyless) and LLMTOKENAPI (via the product API) — and stops using DeepSeek search.

## ADDED Requirements

### Requirement: Two search providers, DeepSeek search off

The Matreshka web/desktop composition MUST register search providers `keenable` and `llmtokenapi`, MUST set the default search provider to `keenable`, and MUST NOT register a usable DeepSeek search provider.

#### Scenario: Default search is Keenable

- **WHEN** the Matreshka composition loads
- **THEN** `ctx.web` default search provider is `keenable` and DeepSeek search is not selected

### Requirement: Keenable is keyless

The `keenable` provider MUST call Keenable's public search endpoint with `X-Keenable-Title: Matreshka` and MUST NOT send an API key. It MUST be available without `LLMTOKENAPI_API_KEY`.

#### Scenario: Keenable without a key

- **WHEN** no Keenable or LLMTOKENAPI key is configured and the Host searches with provider `keenable`
- **THEN** the request is sent to Keenable public search and includes `X-Keenable-Title`

### Requirement: LLMTOKENAPI search uses the session

The `llmtokenapi` search provider MUST POST `{apiOrigin}/v1/web/search` with `provider` `llmtokenapi` and `Authorization: Bearer` of the Matreshka session token. It MUST NOT send `LLMTOKENAPI_API_KEY`. Without a session token it MUST be unavailable.

#### Scenario: No session means LLMTOKENAPI search unavailable

- **WHEN** no Matreshka session token is stored
- **THEN** the `llmtokenapi` search provider reports unavailable and does not call the Matreshka API
