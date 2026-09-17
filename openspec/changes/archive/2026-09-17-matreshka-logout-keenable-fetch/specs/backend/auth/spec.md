## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Logout

`POST /v1/auth/logout` MUST delete the Redis session for the presented bearer token and return 204. A missing, malformed, or unknown token MUST still return 204 (idempotent). The response MUST NOT include the token.

#### Scenario: Logout revokes the token

- **WHEN** a client with a valid token posts `/v1/auth/logout`
- **THEN** the response is 204 and a later protected call with that token is 401

#### Scenario: Logout without a session is idle

- **WHEN** a client posts `/v1/auth/logout` without a valid token
- **THEN** the response is 204
