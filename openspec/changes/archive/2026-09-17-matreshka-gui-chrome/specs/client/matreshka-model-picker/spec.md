## Purpose

Presents a single Matreshka model in the GUI picker so operators call the product backend only.

## ADDED Requirements

### Requirement: Picker lists only Matrena

The model picker MUST show exactly one selectable model, named Matrena, served by the Matreshka session route. It MUST NOT list DeepSeek-official catalog models or any other `llm-pi-ai` provider (including Grok) even when `$DSH_HOME/settings.yaml` declares extra providers.

#### Scenario: Fresh Matreshka session

- **WHEN** the operator opens the model picker after sign-in
- **THEN** the only listed model is Matrena

#### Scenario: Leftover settings providers stay hidden

- **WHEN** `$DSH_HOME/settings.yaml` contains an `llm-pi-ai` Grok (or other) provider
- **THEN** the picker still lists only Matrena
