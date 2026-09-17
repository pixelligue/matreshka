# desktop/auto-update Specification

## Purpose

Points the packaged Matreshka Desktop updater at the product API generic feed so installs never query DeepSeek's download host.

## Requirements

### Requirement: Feed URL is the Matreshka API

A packaged Desktop MUST check for updates at `{apiOrigin}/v1/updates/desktop/{target}/` where `target` is `win-x64`, `mac-arm64`, or `mac-x64` for that build, and `apiOrigin` defaults to `http://127.0.0.1:8016`. The feed URL MUST NOT contain `download.deepseek.com` or `_/harness/desktop/stable`. An unpackaged process MUST NOT query any update feed.

#### Scenario: Default packaged check

- **WHEN** a packaged Windows x64 build checks for updates with the default origin
- **THEN** it requests `{apiOrigin}/v1/updates/desktop/win-x64/` channel metadata and does not contact `download.deepseek.com`

#### Scenario: Unpackaged process stays idle

- **WHEN** Desktop runs unpackaged from source
- **THEN** it does not send an update-feed HTTP request

### Requirement: Existing check and install UX

The packaged app MUST still check shortly after the main window opens and from the localized Check for Updates menu item. An available version MUST show one native confirmation dialog. Accepting MUST download that feed's artifacts, stop the dsh child, and install plus restart. Declining MUST leave the running version in place.

#### Scenario: User declines

- **WHEN** a newer version is available and the operator dismisses the confirmation
- **THEN** the running application is not replaced
