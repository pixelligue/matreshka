## Purpose

Keeps Matreshka session chrome free of agent-preset names and pickers while every session still runs Standard.

## ADDED Requirements

### Requirement: No preset name in the session header

Matreshka MUST NOT show an agent-preset name such as Standard mode in the session header.

#### Scenario: Open session

- **WHEN** an operator opens a session
- **THEN** the header does not contain a control or label for Standard mode, PTC mode, Minimal mode, or Creator mode

### Requirement: No new-session preset chip

Matreshka MUST NOT offer an agent-preset picker on the empty-session screen.

#### Scenario: Empty session

- **WHEN** the empty-session hero is visible
- **THEN** no agent-preset chip or mode picker is present
