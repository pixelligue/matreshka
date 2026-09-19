## Why

Matreshka always runs the full Standard agent. The session header still shows “Standard mode”, and the Windows Application menu at the top left still appears because unpackaged Desktop launches compiled `lib/main.js`.

## What Changes

- Session header and empty-session hero do not show agent-preset chrome. New sessions still receive the Standard default.
- Windows Application menu is stripped on the compiled Desktop shell (`lib/main.js`), including per-window `removeMenu()`.

## Non-goals

- No PTC/Minimal/Creator picker. No change to the agent composition itself.

## Capabilities

### New Capabilities

- `client/matreshka-preset-chrome`: session UI does not show an agent-preset name or picker.

### Modified Capabilities

- None. Menu-bar hiding is already specified; this change rebuilds the Desktop artifact so it takes effect.

## Impact

- `@deepseek-ai/dsh-client-ui-agent-preset` Config `sessionChrome`, `packages/bundle/web-app/cordis.patch.yml`, `apps/desktop/src/main.ts` and `lib/main.js`.
