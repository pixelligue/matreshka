# Agent Note: Matreshka startup mark and hidden harness chrome

Status: implemented

English | [中文](2026-09-18-matreshka-startup-chrome.zh.md)

## Problem

Desktop started with a generic CSS spinner, a Windows Application menu that listed Plugins, Check for Updates, and Exit, and session chrome that still offered Trajectory and Download session log. Those are harness operator surfaces, not Matreshka product chrome.

## Decision

The shell startup page (`dsh-app://shell/startup.html`) shows `apps/desktop/renderer/matreshka-logo.png` as the loading mark and wobbles it with the same tumbler motion as the empty-session hero. Reduced motion keeps the mark static. A startup error hides the mark and leaves recovery actions. The PNG is a copy of `apps/web/public/matreshka-logo.png`; `serveShellAsset` serves `.png` as `image/png`.

Windows and Linux call `Menu.setApplicationMenu(null)` and each window uses `setMenu(null)`, `removeMenu()`, and `setMenuBarVisibility(false)` so the Application bar does not remain. macOS registers `{ role: 'appMenu' }` only. Packaged update checks still run through `checkAndPrompt(false)` ten seconds after the main window is ready. There is no Plugins window and no manual Check for Updates menu item.

The Desktop overlay `apps/desktop-host/config/desktop.cordis.patch.yml` sets `disabled: true` on `ui-trajectory` and `session-log-download`. The web profile on port 8080 is unchanged. The packages remain in the tree.

## Alternatives considered

- **Keep the spinner and only restyle it.** Rejected: the product mark is already the hero loading language.
- **Leave the Windows Application menu and hide items with `visible: false`.** Rejected: an empty or named Application bar is still chrome operators asked to remove.
- **Delete `ui-trajectory` and `session-log-download` from the web-app patch.** Rejected: that would change the web profile; Desktop overlays disable the rows instead.

## Consequences

- Operators cannot open the plugin-manager window from a menu; recovery still offers disable-plugins and reset on a failed start.
- Trajectory and Download session log stay available in `dsh web` and as packages; only Desktop hides them.
- Changing the nesting-doll asset requires updating both the web public file and the renderer copy.
