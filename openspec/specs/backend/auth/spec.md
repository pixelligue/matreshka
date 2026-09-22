# backend/auth Specification

## Purpose

Authenticates operators with email and password, public register, and one-time desktop codes, then issues revocable bearer sessions so Desktop and the public site can call the backend.

## Requirements

### Requirement: Operator-created users only

The system MUST store users with a unique email and a password hash in PostgreSQL. An operator MAY create a user through the documented CLI. Visitors MUST also be able to create an account through `POST /v1/auth/register`.

#### Scenario: CLI creates a user

- **WHEN** an operator runs the user-create CLI with an email and password against a running database
- **THEN** that email can authenticate and a second create with the same email fails

#### Scenario: Public register creates a user

- **WHEN** a client posts a new email and password to `/v1/auth/register`
- **THEN** the response is 201 with a bearer token and that email can authenticate

#### Scenario: Duplicate register

- **WHEN** a client posts `/v1/auth/register` with an email that already exists
- **THEN** the response is 409 and no second user is stored

#### Scenario: No public signup

- **WHEN** a client sends `POST /v1/auth/signup` or another undocumented create-user HTTP path
- **THEN** the server does not create a user (404 or 405)

### Requirement: Email and password login

`POST /v1/auth/login` MUST accept JSON `{ "email": string, "password": string }`. A matching user MUST receive `200` with a bearer token in the JSON body. A missing user or wrong password MUST receive `401` without revealing which field failed.

#### Scenario: Valid credentials

- **WHEN** a client posts the email and password of an operator-created user
- **THEN** the response is 200 and includes a non-empty `token` string

#### Scenario: Invalid credentials

- **WHEN** a client posts an unknown email or a wrong password
- **THEN** the response is 401 and no session is stored

### Requirement: Bearer session

Protected endpoints MUST require `Authorization: Bearer <token>`. The system MUST store sessions in Redis with a TTL. Logout or Redis eviction MUST make the token unusable. An absent, malformed, or unknown token MUST receive `401`.

#### Scenario: Authenticated request

- **WHEN** a client calls a protected endpoint with a token from a successful login
- **THEN** the request is authorized as that user

#### Scenario: Missing token

- **WHEN** a client calls a protected endpoint without `Authorization`
- **THEN** the response is 401

#### Scenario: Revoked session

- **WHEN** the session is deleted from Redis and the client reuses the old token
- **THEN** the response is 401

### Requirement: Logout

`POST /v1/auth/logout` MUST delete the Redis session for the presented bearer token and return 204. A missing, malformed, or unknown token MUST still return 204 (idempotent). The response MUST NOT include the token.

#### Scenario: Logout revokes the token

- **WHEN** a client with a valid token posts `/v1/auth/logout`
- **THEN** the response is 204 and a later protected call with that token is 401

#### Scenario: Logout without a session is idle

- **WHEN** a client posts `/v1/auth/logout` without a valid token
- **THEN** the response is 204

### Requirement: One-time desktop code

Authenticated `POST /v1/auth/desktop-code` MUST return a single-use code stored in Redis with a short TTL (at most 60 seconds). The code MUST NOT be the session bearer.

#### Scenario: Mint code

- **WHEN** a client with a valid bearer posts `/v1/auth/desktop-code`
- **THEN** the response is 200 JSON `{ "code": string, "expiresIn": number }` and `code` is not the bearer token

#### Scenario: Unauthenticated mint

- **WHEN** a client posts `/v1/auth/desktop-code` without a valid bearer
- **THEN** the response is 401

### Requirement: Desktop code exchange

`POST /v1/auth/exchange` MUST accept JSON `{ "code": string }`. A valid unused code MUST return 200 with a new bearer token for that user and MUST invalidate the code. An unknown, expired, or reused code MUST return 401.

#### Scenario: Exchange issues a desktop session

- **WHEN** a client posts a freshly minted code to `/v1/auth/exchange`
- **THEN** the response is 200 with a token that authorizes protected routes, and a second exchange of the same code is 401
