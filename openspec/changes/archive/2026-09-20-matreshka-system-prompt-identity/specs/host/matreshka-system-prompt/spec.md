## Purpose

Stops Matreshka Host sessions from telling the model it is DeepSeek Harness, so Matrena's identity matches the product the operator sees.

## ADDED Requirements

### Requirement: Omit the DeepSeek Harness identity

Matreshka Desktop and the Matreshka web GUI MUST assemble the system prompt without the fixed opener `You are an AI agent powered by DeepSeek Harness.`

#### Scenario: New session opener

- **WHEN** a signed-in Matreshka session sends its first model request
- **THEN** the assembled system prompt does not contain `DeepSeek Harness`

### Requirement: Host-owned prompt sections name Matreshka

Host-owned model-visible prompt sections that describe this product (checkout location, GUI orientation) MUST name Matreshka. They MUST NOT name DeepSeek Harness as the product.

#### Scenario: Web-surface orientation

- **WHEN** the Host registers GUI orientation text for a Matreshka web session
- **THEN** that text names Matreshka and does not contain DeepSeek Harness
