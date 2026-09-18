## Context

See proposal.md. Startup is a static shell page (`apps/desktop/renderer/startup.*`) served as `dsh-app://shell/startup.html`. The empty-session hero already wobbles `/matreshka-logo.png`. The Windows Application menu is `Menu.setApplicationMenu` in `main.ts`. Trajectory is `ui-trajectory`; Download session log is `session-log-download` in the web-app patch. Desktop overlays `apps/desktop-host/config/desktop.cordis.patch.yml`.

## Goals / Non-Goals

**Goals:** Logo loading animation; no Application menu on Windows; hide Trajectory and log download on Desktop.

**Non-Goals:** Office skills; changing Chat; emergency HTML logo.

## Decisions

### 1. Copy the PNG into `renderer/`

`serveShellAsset` only reads `apps/desktop/renderer`. Copy `apps/web/public/matreshka-logo.png` to `apps/desktop/renderer/matreshka-logo.png` and add `.png` to the MIME map.

### 2. Wobble as the loading motion

Reuse the hero tumbler keyframes, looping while `aria-busy` is true. Reduced motion: static mark.

### 3. Hide the menu bar off macOS

`Menu.setApplicationMenu(null)` on win32/linux. Darwin: `{ role: 'appMenu' }` only. Keep `checkAndPrompt(false)` after 10s.

### 4. Disable plugins in the Desktop overlay

```
- id: ui-trajectory
  disabled: true
- id: session-log-download
  disabled: true
```

Web profile on :8080 is unchanged.

## Risks / Trade-offs

- **[Risk] Duplicate PNG.** → Same asset as web public; update both if the mark changes.
- **[Trade-off] No in-app Plugins window on Windows.** → Intended.
- **[Trade-off] Trajectory still exists as a package.** → Disabled, not deleted.

## Migration Plan

Restart unpackaged Desktop. Rollback: revert overlay and menu.

## Open Questions

None.
