## Purpose

Gives Matrena tools to generate and edit pictures through the Matreshka API and persist them as chat attachments.

## ADDED Requirements

### Requirement: generate_image tool

Host MUST register `generate_image` that posts `{apiOrigin}/v1/images/generate` with the session bearer. Arguments MUST include `prompt` and MAY include `n` and `style`. The tool MUST save returned rasters as durable image attachments and render them as image content blocks. It MUST NOT send the OpenRouter key.

#### Scenario: Generate persists images

- **WHEN** Matrena calls `generate_image` with a prompt after sign-in
- **THEN** the tool result includes one or more image attachments visible in chat

### Requirement: edit_image tool

Host MUST register `edit_image` that posts generate with `references` taken from a prior attachment or supplied image bytes plus an instruction prompt.

#### Scenario: Edit uses a prior image

- **WHEN** Matrena calls `edit_image` with an instruction and an image attachment id
- **THEN** the API is posted with that image as a reference and a new attachment is returned
