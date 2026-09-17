# backend/auth Specification

## Purpose

Authenticates operators with email and password and issues revocable bearer sessions so the desktop and CLI can call the backend without a public signup flow.

## Requirements

### Requirement: Operator-created users only

The system MUST store users with a unique email and a password hash in PostgreSQL. The HTTP API MUST NOT expose a registration or user-create endpoint. An operator MUST create a user through the documented CLI or a SQL insert.

#### Scenario: CLI creates a user

- **WHEN** an operator runs the user-create CLI with an email and password against a running database
- **THEN** that email can authenticate and a second create with the same email fails

#### Scenario: No public signup

- **WHEN** a client sends `POST /v1/auth/register` or any undocumented create-user HTTP path
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
