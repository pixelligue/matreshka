# backend/web-search Specification

## Purpose

Lets the Matreshka API run web search through Keenable's public endpoint and through LLMTOKENAPI search so the desktop never holds the LLMTOKENAPI key.

## Requirements

### Requirement: Authenticated search proxy

`POST /v1/web/search` MUST require a bearer session. JSON MUST include `query` (string) and MAY include `provider` (`keenable` or `llmtokenapi`) and `maxResults` (positive integer). Default provider is `keenable`. The response MUST be 200 JSON `{ "sources": [ { "url": string, "title"?: string, "snippet"?: string, "publishedAt"?: string } ] }`. The LLMTOKENAPI key MUST NOT appear in the body.

#### Scenario: Unauthenticated search

- **WHEN** a client posts `/v1/web/search` without a valid bearer token
- **THEN** the response is 401 and neither Keenable nor LLMTOKENAPI is contacted

#### Scenario: Keenable default

- **WHEN** a client with a valid token posts `{ "query": "typescript" }`
- **THEN** the API calls Keenable's public search and returns 200 with `sources`

#### Scenario: LLMTOKENAPI provider

- **WHEN** a client with a valid token posts `{ "query": "rag", "provider": "llmtokenapi" }`
- **THEN** the API calls LLMTOKENAPI `POST /v1/search` with the server key and returns 200 `sources` whose body does not contain the key

#### Scenario: Unknown provider

- **WHEN** a client with a valid token posts `provider` `exa`
- **THEN** the response is 400 and no upstream search is contacted
