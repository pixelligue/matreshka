# backend/plugin-connections Specification

## Purpose

Stores per-user connection secrets for CIS plugins on the FastAPI backend and proxies their APIs so Desktop never holds those secrets.

## Requirements

### Requirement: Connect without exposing secrets to Desktop

`POST /v1/plugins/{id}/connect` MUST require a bearer session. The body holds the provider credential (Bitrix inbound webhook URL, Tilda public+secret keys, or amoCRM long-lived token / OAuth code). The API MUST persist the secret server-side and MUST NOT echo it in later GET status responses.

#### Scenario: Connect Bitrix24

- **WHEN** a signed-in client posts a Bitrix inbound webhook URL to `/v1/plugins/bitrix24/connect`
- **THEN** later `GET /v1/plugins/bitrix24` returns connected true and does not include the webhook secret

#### Scenario: Unauthenticated connect

- **WHEN** a client posts connect without a valid token
- **THEN** the response is 401 and nothing is stored

### Requirement: Proxied plugin calls

Authenticated `POST /v1/plugins/{id}/call` MUST use the stored secret to call the upstream API and MUST return 409 when the plugin is not connected. The upstream secret MUST NOT appear in the client response.

#### Scenario: Call without connection

- **WHEN** a signed-in client posts `/v1/plugins/amocrm/call` with no stored amoCRM credential
- **THEN** the response is 409

#### Scenario: Call hides secret

- **WHEN** a connected Tilda call fails upstream
- **THEN** the error body does not contain the Tilda secret key
