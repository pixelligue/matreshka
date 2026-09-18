## Purpose

Shows a Matreshka nesting-doll loading mark instead of a generic spinner while Desktop starts.

## ADDED Requirements

### Requirement: Loading mark

While Desktop is starting, the shell startup page MUST show the Matreshka nesting-doll image as the loading indicator and MUST NOT show the circular CSS spinner. The mark MUST gently wobble unless the operator prefers reduced motion. On a startup error the mark MUST hide and recovery actions MUST remain available.

#### Scenario: Starting

- **WHEN** Desktop shows the startup page in the starting phase
- **THEN** the nesting-doll image is visible, the circular spinner is absent, and the title still names Matreshka

#### Scenario: Failed start

- **WHEN** the backend reports an error on the startup page
- **THEN** the nesting-doll loading mark is hidden and recovery controls are shown
