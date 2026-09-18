# Agent Note: Hide Matreshka agent-preset session chrome

Status: implemented

English | [中文](2026-09-18-matreshka-preset-session-chrome.zh.md)

## Problem

Every Matreshka session runs the full Standard agent. The session header still labeled "Standard mode", and unpackaged Desktop kept showing the Windows Application menu because `start:desktop --skip-build` launches compiled `lib/main.js`, not `src/main.ts`.

## Decision

`ui-agent-preset` Config adds `sessionChrome` (default false), because browser plugins do not receive YAML config. The header preset name and new-session chip are not registered. The seat still applies the deployment default (`standard`) to new sessions.

Windows menu hiding is compiled into `apps/desktop/lib/main.js`. Unpackaged Desktop must rebuild that artifact after `main.ts` menu changes. Each window also gets `setMenu(null)` / `removeMenu()` / `setMenuBarVisibility(false)`, and `browser-window-created` repeats that.

## Alternatives considered

- **Disable `ui-agent-preset` entirely.** Rejected: new sessions would not apply the Standard default through the seat.
- **CSS-hide the header label.** Rejected: the slot would still occupy header space and stay in the accessibility tree.

## Consequences

- Operators cannot pick PTC, Minimal, or Creator from the GUI. Changing that needs `sessionChrome: true` and the Agent presets settings section.
- A `pnpm run start:desktop` after a `main.ts` edit does not pick up the menu change until `pnpm --filter @deepseek-ai/dsh-desktop run build`.
