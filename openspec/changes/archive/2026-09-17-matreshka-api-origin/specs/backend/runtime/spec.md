## ADDED Requirements

### Requirement: Local API listen port

The documented local API start MUST bind the HTTP process to loopback port 8016 so it matches the Host default origin `http://127.0.0.1:8016`.

#### Scenario: Documented start uses 8016

- **WHEN** an operator follows the backend README start command
- **THEN** the listed command binds port 8016
