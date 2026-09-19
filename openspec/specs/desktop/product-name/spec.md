# desktop/product-name Specification

## Purpose
Presents the Desktop application as Matreshka in the window, installer display name, and shell messages so operators never see DeepSeek Harness as the product name.

## Requirements

### Requirement: Display name is Matreshka

Packaged Desktop MUST use the installer/application display name Matreshka. The loaded GUI document title MUST be Matreshka (or start with Matreshka when a session suffix is appended). Unpackaged Desktop MUST use the same display title for the window the operator sees. The reverse-DNS `appId` and the on-disk artifact file stem MAY stay the upstream `deepseek-harness-…` names.

#### Scenario: Packaged display name

- **WHEN** a Windows or macOS package is built for Matreshka
- **THEN** the installer/app display name is Matreshka and is not DeepSeek Harness

#### Scenario: Window title

- **WHEN** Desktop shows the main window after launch
- **THEN** the window or document title contains Matreshka and does not contain DeepSeek Harness

### Requirement: Shell dictionaries name Matreshka

English, Chinese, and Russian Desktop shell messages that currently name the product MUST say Matreshka, not DeepSeek Harness. This includes startup loading and failure, the update dialog title and detail, and the plugin-manager window title.

#### Scenario: English startup

- **WHEN** Desktop starts with an English locale
- **THEN** the loading and failure copy name Matreshka and do not contain DeepSeek Harness

#### Scenario: English update dialog

- **WHEN** an update is available and the confirmation dialog is shown in English
- **THEN** the title and detail name Matreshka and do not contain DeepSeek Harness
