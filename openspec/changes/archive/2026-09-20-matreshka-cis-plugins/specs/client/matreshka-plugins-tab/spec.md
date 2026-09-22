## Purpose

Gives Matreshka a sidebar Plugins tab and a catalog pane so the operator can enable CIS integrations without opening Settings or the harness plugin manager.

## ADDED Requirements

### Requirement: Plugins row in the sidebar

The sidebar MUST show a Plugins row in `sidebar.panellist` immediately under New session and above Workspaces. The collapsed rail MUST show the same row as an icon. The row MUST use locale-owned copy (RU/EN/ZH).

#### Scenario: Expanded sidebar

- **WHEN** the sidebar is expanded
- **THEN** a Plugins row is visible under New session and above the workspace list

#### Scenario: Collapsed rail

- **WHEN** the sidebar is collapsed
- **THEN** the Plugins icon remains in the rail and still opens the catalog

### Requirement: Catalog pane replaces chat

Selecting Plugins MUST set the active main panel to the Plugins catalog and MUST hide the conversation until the operator selects a session or New session.

#### Scenario: Open Plugins

- **WHEN** the operator clicks Plugins
- **THEN** the main pane shows the plugin catalog and does not show the current chat transcript

#### Scenario: Leave Plugins

- **WHEN** the operator clicks New session or a session in Workspaces
- **THEN** the catalog closes and chat is visible again

### Requirement: Four catalog cards

The catalog MUST list exactly these built-in plugins in v1: amoCRM, Bitrix24, Tilda, Hotels. Word, Excel, and PDF MUST NOT appear as catalog cards.

#### Scenario: Catalog contents

- **WHEN** the Plugins pane is open
- **THEN** the four cards amoCRM, Bitrix24, Tilda, and Hotels are present and no Documents card is present
