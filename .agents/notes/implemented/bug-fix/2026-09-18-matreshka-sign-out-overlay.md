# Agent Note: Matreshka sign-in overlay after Sign out

Status: implemented

English | [中文](2026-09-18-matreshka-sign-out-overlay.zh.md)

## Problem

Sign out cleared the browser session and Host credential, but the operator stayed in chrome. The sign-in page registered on `settings.onboarding`, which mounts only while the current chat is blank. A filled session never remounts that step, so Sign out could not return to the blocking page.

## Decision

`MatreshkaSignInDialog` occupies `shell.overlay` id `matreshka-sign-in`. The overlay hides only when both the Host credential and the browser token exist, and it listens for `matreshka-session` so Sign out shows the page again without waiting for an empty-hero onboarding step. The versioned welcome notice stays on `settings.onboarding`.

## Alternatives considered

**Keep sign-in on `settings.onboarding` and always run the coordinator.** That would also remount the welcome notice during filled chats and still skip the sign-in step after `complete()` until reload. Sign-in is a session gate, not a first-run notice.

**Rely on `window.location.reload()` after Sign out.** Reload does not change the empty-hero condition. A filled chat still skips the onboarding occupant.

## Consequences

Sign out from a filled chat returns to the blocking page. First-run order is sign-in, then the welcome notice on an empty hero. Component tests cover session-clear remount; the settings-general shell roster expects only `welcome-notice` on `settings.onboarding`.
