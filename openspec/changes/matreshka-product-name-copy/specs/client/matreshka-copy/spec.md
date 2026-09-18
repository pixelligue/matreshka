## Purpose

Replaces leftover DeepSeek Harness GUI sentences on the welcome notice, web-search settings blurb, and empty-session hero with Matreshka product copy.

## ADDED Requirements

### Requirement: Welcome notice is Matreshka

When the internal-testing welcome step is shown, its body MUST be locale-owned Matreshka copy. It MUST NOT mention DeepSeek Harness, DSH, or the Harness plugin ecosystem. English, Russian, and Chinese dictionaries MUST keep the same keys.

#### Scenario: Russian welcome

- **WHEN** the welcome notice is visible with the active locale Russian
- **THEN** the body is Russian Matreshka wording and does not contain DeepSeek Harness

#### Scenario: English welcome

- **WHEN** the welcome notice is visible with the active locale English
- **THEN** the body is English Matreshka wording and does not contain DeepSeek Harness

### Requirement: Web-search description is Matreshka

The plugins settings web-search description MUST name Matreshka web search. It MUST NOT say that the provider is DeepSeek.

#### Scenario: Russian plugins card

- **WHEN** the operator opens Plugins settings with the active locale Russian
- **THEN** the web-search description is Russian and does not contain DeepSeek

### Requirement: Empty-session hero copy is Matreshka

The empty-session hero headline MUST NOT be `Into the Unknown`, `В неизвестность`, or `探索未至之境`. The preview badge MUST be locale-owned Matreshka copy and MUST NOT use the DeepSeek Harness Preview tagline pair (`Preview` / `Превью` / `预览版` as that DSH pair). Both strings MUST exist in en, ru, and zh with matching keys.

#### Scenario: Russian empty session

- **WHEN** the GUI shows an empty session with the active locale Russian
- **THEN** the hero headline is Russian Matreshka wording other than `В неизвестность`, and the badge is not the DSH `Превью` tagline

#### Scenario: English empty session

- **WHEN** the GUI shows an empty session with the active locale English
- **THEN** the hero headline is not `Into the Unknown`
