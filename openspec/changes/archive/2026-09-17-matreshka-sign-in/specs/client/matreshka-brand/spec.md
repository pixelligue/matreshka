## Purpose

Presents Matreshka as the product company in the GUI chrome the user sees first: a nesting-doll mark and the name Matreshka, not DeepSeek Harness.

## ADDED Requirements

### Requirement: Sidebar brand

The sidebar brand mark slot MUST render a Matreshka nesting-doll graphic. The sidebar brand name slot MUST render the text Matreshka. This MUST apply to Matreshka client builds, not only the DSH `official` profile.

#### Scenario: Sidebar shows Matreshka

- **WHEN** the GUI shell is visible after sign-in
- **THEN** the sidebar brand name is Matreshka and the mark is the nesting-doll asset, not the DeepSeek official wordmark

### Requirement: No DeepSeek API-key onboarding

The first-run DeepSeek official API-key onboarding step MUST NOT appear. Model access is the Matreshka session, not a user-pasted DeepSeek key.

#### Scenario: DeepSeek key dialog absent

- **WHEN** a new profile has no DeepSeek credential
- **THEN** the GUI does not show "Add an API key to get started" / the DeepSeek-official onboarding title
