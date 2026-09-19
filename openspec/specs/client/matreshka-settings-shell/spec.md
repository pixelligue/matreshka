# client/matreshka-settings-shell Specification

## Purpose
Presents Matreshka Settings as a compact General sheet: one title row, no empty nav rail, and no configuration-file opener.

## Requirements

### Requirement: Single-section dialog has no nav rail

When Settings shows only one section, the dialog MUST place the title on the same header row as Close and MUST NOT reserve a left navigation column.

#### Scenario: Open Settings with only General

- **WHEN** the operator opens Settings and only the General section is visible
- **THEN** the dialog has no empty left rail, the title names Settings, and Close remains available

### Requirement: Compact panel for General

While only General is visible, the Settings dialog MUST size to the General list instead of a large empty two-column frame.

#### Scenario: General list fits the panel

- **WHEN** Settings is open on General only
- **THEN** the panel is no wider than needed for the General rows and does not leave a large empty column beside them

### Requirement: No open-configuration action

Matreshka Settings MUST NOT offer an Open configuration file control.

#### Scenario: Settings header

- **WHEN** the operator opens Settings
- **THEN** no control labeled Open configuration file (or the locale equivalent) is present
