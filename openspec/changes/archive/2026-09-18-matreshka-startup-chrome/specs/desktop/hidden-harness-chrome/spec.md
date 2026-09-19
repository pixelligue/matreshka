## Purpose

Hides harness-only session chrome — the Trajectory view and Download session log — from the Matreshka Desktop composition.

## ADDED Requirements

### Requirement: No Trajectory view

Matreshka Desktop MUST NOT show a Trajectory tab or view in the session chrome.

#### Scenario: Open session

- **WHEN** an operator opens a session in Desktop
- **THEN** no control labeled Trajectory is present

### Requirement: No session-log download menu

Matreshka Desktop MUST NOT show a Download session log action in the session header menu.

#### Scenario: Session header menu

- **WHEN** the operator opens the session header overflow menu in Desktop
- **THEN** Download session log is not listed
