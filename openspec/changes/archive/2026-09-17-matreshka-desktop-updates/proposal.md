## Why

Packaged Desktop still checks DeepSeek's generic-provider feed (`https://download.deepseek.com/_/harness/desktop/stable/...`). Matreshka must check our API instead, and that API must host the electron-updater channel files so operators can ship a new Desktop build without Tencent COS.

## What Changes

- **BREAKING (packaged Desktop):** the updater feed URL is `{apiOrigin}/v1/updates/desktop/{win-x64|mac-arm64|mac-x64}/`. It MUST NOT use `download.deepseek.com` or `_/harness/desktop/stable`.
- Keep electron-updater: 10s check, **Check for Updates…**, one confirm dialog, download, quit-and-install. Change the feed origin only.
- Backend serves that layout without a session token: channel YAML (`latest.yml` / `latest-mac.yml`) and the named artifacts next to it.
- Operators publish by placing a complete target directory (YAML + installer/zip + blockmap) under `UPDATE_ARTIFACT_ROOT`. A CLI copies a packaged target into that tree.
- Default origin stays `http://127.0.0.1:8016` (same as sign-in). HTTP is allowed so local packaged checks work.

## Non-goals

- No new updater UI, no silent install, no Linux AppImage channel.
- No COS/Tencent upload, no GitHub Releases provider.
- No code-signing or notarization rewrite.
- No bearer auth on GET (updates must work with no session).
- No HTTP upload/PUT of artifacts (filesystem + CLI only).
- No web/PWA update flow.

## Capabilities

### New Capabilities

- `desktop/auto-update`: packaged Electron checks and installs from the Matreshka API generic feed.
- `backend/desktop-updates`: API serves and operators publish electron-updater files per Desktop target.

### Modified Capabilities

- None. `host/matreshka-models` origin default is reused, not redefined.

## Impact

- **Upstream seams:** `apps/desktop` (`desktop-auto-update-environment.mjs`, `update-coordinator.ts`, electron-builder `publish.url`) and `backend/` (static update routes, settings, CLI).
- Existing Desktop check/install UX stays. COS upload scripts are unused for Matreshka feeds.
