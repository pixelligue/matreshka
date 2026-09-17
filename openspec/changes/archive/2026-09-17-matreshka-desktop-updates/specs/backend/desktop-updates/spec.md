## Purpose

Lets the Matreshka API host electron-updater generic feeds so operators can publish Desktop builds and packaged apps can download them without a session token.

## ADDED Requirements

### Requirement: Unauthenticated channel and artifacts

`GET /v1/updates/desktop/{target}/{name}` MUST NOT require `Authorization`. Allowed `target` values are `win-x64`, `mac-arm64`, and `mac-x64`. Any other target MUST return 404. `{name}` MUST be a single path segment (no `/` or `..`). A missing file MUST return 404. Windows channel metadata is `latest.yml`; macOS channel metadata is `latest-mac.yml`. Artifact bytes named in that YAML MUST be served from the same target directory.

#### Scenario: Windows channel without a token

- **WHEN** a client GETs `/v1/updates/desktop/win-x64/latest.yml` with no Authorization and that file exists
- **THEN** the response is 200 and the body is the stored YAML

#### Scenario: Unknown target

- **WHEN** a client GETs `/v1/updates/desktop/linux-x64/latest.yml`
- **THEN** the response is 404

#### Scenario: Missing artifact

- **WHEN** `UPDATE_ARTIFACT_ROOT` is set but `win-x64/latest.yml` is absent
- **THEN** `GET /v1/updates/desktop/win-x64/latest.yml` returns 404

### Requirement: Artifact root is optional at process start

The API process MUST start when `UPDATE_ARTIFACT_ROOT` is unset. While it is unset, every update GET MUST return 404. When it is set, files MUST be read from `{UPDATE_ARTIFACT_ROOT}/{target}/{name}` and MUST NOT be read from a path outside that target directory.

#### Scenario: Unconfigured root

- **WHEN** the process started without `UPDATE_ARTIFACT_ROOT` and a client GETs any update path
- **THEN** the response is 404 and the process remains up

### Requirement: Operator publish CLI

`matreshka-api publish-desktop --target <target> --from <dir>` MUST copy the channel YAML and the artifact files it names from `<dir>` into `{UPDATE_ARTIFACT_ROOT}/{target}/`. It MUST fail non-zero and name `UPDATE_ARTIFACT_ROOT` when that variable is unset. It MUST reject a target outside the allowlist.

#### Scenario: Publish copies a Windows feed

- **WHEN** an operator runs publish-desktop for `win-x64` from a directory that contains `latest.yml` and the files it names, with `UPDATE_ARTIFACT_ROOT` set
- **THEN** those files exist under `{UPDATE_ARTIFACT_ROOT}/win-x64/` and a later GET of `latest.yml` returns 200

#### Scenario: Publish without a root fails loud

- **WHEN** `UPDATE_ARTIFACT_ROOT` is unset and an operator runs publish-desktop
- **THEN** the command exits non-zero and names `UPDATE_ARTIFACT_ROOT`
