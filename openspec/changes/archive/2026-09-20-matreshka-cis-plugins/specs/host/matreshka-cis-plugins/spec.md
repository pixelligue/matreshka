## Purpose

Turns catalog enablement into skills and tools Matrena can use, without exposing internal document skills as plugins.

## ADDED Requirements

### Requirement: Enablement gates skills

When a catalog plugin is enabled for the signed-in user, Host MUST load that plugin's skill into new sessions. When it is disabled, Matrena MUST NOT see that skill.

#### Scenario: Enable amoCRM

- **WHEN** the operator enables amoCRM
- **THEN** the next session includes the amoCRM skill

#### Scenario: Disable Tilda

- **WHEN** the operator disables Tilda
- **THEN** a new session does not include the Tilda skill

### Requirement: Connected tools

amoCRM, Bitrix24, and Tilda tools MUST call the Matreshka API with the session bearer and MUST fail closed when the plugin is disabled or not connected. Hotel search MUST use the existing web-search path plus a hotel skill and MUST NOT book or charge.

#### Scenario: amoCRM without connection

- **WHEN** amoCRM is enabled but no account is connected
- **THEN** an amoCRM tool reports that connection is required and does not call amoCRM

#### Scenario: Hotel search

- **WHEN** Hotels is enabled and the operator asks for hotels in a city
- **THEN** Matrena may use web search under the hotel skill and MUST NOT create a paid booking

### Requirement: Documents stay internal

Word, Excel, and PDF skills MUST remain available as internal skills and MUST NOT be listed or toggled on the Plugins catalog.

#### Scenario: Documents not in catalog

- **WHEN** the operator opens Plugins
- **THEN** no control enables or disables Word, Excel, or PDF as a plugin
