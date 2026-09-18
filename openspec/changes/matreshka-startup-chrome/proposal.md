## Why

The Desktop loading screen is a generic spinner, the Windows Application menu exposes plugins and updates that Matreshka operators should not see, and session chrome still offers Trajectory and Download session log — internal harness surfaces, not product tools.

## What Changes

- Startup loading replaces the CSS spinner with the Matreshka nesting-doll mark and a quiet tumbler wobble (same motion as the empty-session hero). Failure recovery chrome stays.
- The Windows/Linux application menu bar is removed. macOS keeps only the system app menu (Quit/Hide), without Plugins or Check for Updates. Packaged update checks still run in the background.
- Desktop composition disables `ui-trajectory` and `session-log-download` so those tabs/menus do not appear.

## Non-goals

- No Excel/Word/PDF skill pack in this change (separate later).
- No theme restyle of Chat, no hiding the Chat tab.
- No change to auto-update behavior except removing the manual menu item.
- Emergency data-URL recovery document stays text-only (no logo file).

## Capabilities

### New Capabilities

- `desktop/startup-mark`: loading screen uses the Matreshka mark animation.
- `desktop/menu-bar`: non-macOS has no application menu; macOS has no Plugins/Updates items.
- `desktop/hidden-harness-chrome`: Desktop hides Trajectory and session-log download.

### Modified Capabilities

- None.

## Impact

- `apps/desktop/renderer/startup.{html,css,js}`, `apps/desktop/src/main.ts` (menu, PNG MIME), `apps/desktop-host/config/desktop.cordis.patch.yml`.
- Tests: `startup-renderer.spec.ts`, `main-startup.spec.ts` menu registration.
