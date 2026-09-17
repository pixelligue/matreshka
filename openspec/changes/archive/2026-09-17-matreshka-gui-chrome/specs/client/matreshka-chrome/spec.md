## Purpose

Keeps workspace rows and the session header readable as Matreshka chrome: a folder mark, intact titles, and an uncrowded header.

## ADDED Requirements

### Requirement: Workspace row uses a folder mark

Each workspace row in the sidebar MUST use the product folder SVG (open when expanded, closed when collapsed). It MUST NOT use the nesting-doll logo.

#### Scenario: Expanded and collapsed workspace

- **WHEN** a workspace row is visible, expanded or collapsed
- **THEN** its leading mark is the folder SVG, open or closed with the row, not the nesting-doll asset

### Requirement: Session titles keep Unicode intact

Session titles in the workspace list and the session header MUST render the stored Unicode text. Truncation MUST NOT introduce U+FFFD replacement characters.

#### Scenario: Cyrillic title in the list

- **WHEN** a session title contains Cyrillic and the list truncates it
- **THEN** visible characters are valid Unicode from that title, with no replacement diamonds

#### Scenario: Cyrillic title in the header

- **WHEN** the same session is open
- **THEN** the header title matches the stored title without replacement characters

### Requirement: Session header stays readable

The session header MUST keep the title as the primary readable label. Preset mode and background-task counts MUST NOT overlap, clip, or corrupt the title.

#### Scenario: Title plus mode chrome

- **WHEN** a session is open with a long title, a preset label, and running background tasks
- **THEN** the title remains fully glyph-correct and visually primary; mode and task chrome sit beside or below it without overlapping
