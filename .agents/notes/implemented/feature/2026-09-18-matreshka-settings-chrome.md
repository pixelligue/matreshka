# Agent Note: Matreshka compact Settings sheet

Status: implemented

English | [中文](2026-09-18-matreshka-settings-chrome.zh.md)

## Problem

Settings still used the DeepSeek two-column 800×800 shell. Matreshka already hides Models, Plugins, Agent presets, and Archived sessions, so the 188px nav rail was an empty title column, and loopback Desktop still offered Open configuration file.

## Decision

When one settings section is visible, `SettingsRoot` omits the nav rail, puts the title on the header row with Close, and uses a compact content-sized panel (about 560px). Two or more visible sections keep the 800px two-column frame. `ui-settings-general` Config adds `documentAction` (default false). The web-app patch also sets `documentAction: false`. Whole-client tests apply Zod defaults rather than YAML `config`.

## Alternatives considered

- **Hide the open-document plugin by disabling a row in the Desktop overlay.** Rejected: the action is registered inside `ui-settings-general`, not as its own plugin id.
- **Always content-size the panel.** Rejected: switching among several sections would resize under the pointer; the 800px frame stays for that case.

## Consequences

- Operators cannot open the Host settings file from the dialog; the file on disk is unchanged.
- Un-hiding Models or Plugins restores the two-column shell automatically.
