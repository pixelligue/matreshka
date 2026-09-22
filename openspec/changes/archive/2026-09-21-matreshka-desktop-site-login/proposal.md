# Proposal

## Why

Desktop still shows the in-app email/password overlay when unpackaged. Operators should sign in only on the public site. The old form in the app is leftover from development.

## What Changes

- Desktop (packaged and unpackaged) shows only the website sign-in control. It does not collect email or password.
- Local email/password remains only for the web GUI (no Desktop auth bridge) and when `MATRESHKA_LOCAL_LOGIN=1`.
- Unpackaged Desktop still opens the landing login with `?next=desktop` and still accepts `matreshka://auth?code=`.

## Non-goals

- No change to landing `/login` and `/register` (those keep email and password).
- No OAuth or email verification.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `client/matreshka-sign-in`: Desktop overlay is website-only unless local login is forced.
- `desktop/matreshka-web-auth`: unpackaged Desktop also opens the site.

## Impact

- **Upstream seam:** `apps/desktop/src/main.ts` (`desktopLocalLogin`) and the sign-in overlay.
