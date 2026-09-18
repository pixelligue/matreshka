## 1. Startup mark

- [x] 1.1 Copy `matreshka-logo.png` into `apps/desktop/renderer`, add PNG MIME, replace the spinner with the wobbling mark (static under reduced motion), and verify `startup-renderer` shows the image while starting and hides it on error

## 2. Menu bar

- [x] 2.1 Stop registering the Application submenu on Windows/Linux (`setApplicationMenu(null)`), keep macOS `appMenu` without Plugins/Updates, keep background `checkAndPrompt(false)`, and verify `main-startup` no longer builds a Plugins/Updates template on win32

## 3. Hide harness chrome

- [x] 3.1 Disable `ui-trajectory` and `session-log-download` in `desktop.cordis.patch.yml` and verify a composition/unit test or grep that Desktop overlay sets both `disabled: true`
