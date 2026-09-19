## Purpose

Removes the Windows Application menu that exposed Desktop plugins, update checks, and Exit, without blocking background update checks.

## ADDED Requirements

### Requirement: No product Application menu on Windows

On Windows and Linux, Desktop MUST NOT show an application menu bar with Plugins, Check for Updates, or Exit. Background packaged update checks MAY still run without a menu item.

#### Scenario: Windows launch

- **WHEN** Desktop starts on Windows
- **THEN** it does not register an Application menu containing Plugins or Check for Updates

### Requirement: macOS keeps only the system app menu

On macOS, Desktop MUST NOT list Plugins or Check for Updates in the application menu.

#### Scenario: macOS launch

- **WHEN** Desktop starts on macOS
- **THEN** the application menu does not include Plugins or Check for Updates
