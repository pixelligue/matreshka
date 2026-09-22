# Proposal

## Why

Desktop opens the site login form, so a new operator tries to sign in before they have an account. The site also forgets the session on refresh, so they look unauthenticated even after a successful register.

## What Changes

- Desktop website sign-in opens `/register?next=desktop` (English `/en/register?next=desktop`). Returning visitors with a stored site session skip the form and hand off to Desktop.
- Successful register or login stores the bearer in `localStorage`. Refreshing `/login` or `/register` shows the signed-in state. Register still mints a desktop code and opens `matreshka://` without putting the bearer in the URL.
- Sign out clears the stored site session.

## Non-goals

- No email verification. No cookie auth. Desktop overlay stays website-only.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `web/matreshka-landing`: persist site session; restore on refresh; register-first desktop handoff.
- `desktop/matreshka-web-auth`: open the register URL with the desktop handoff query.

## Impact

- **Upstream seam:** `apps/landing` AuthPage + session helper; `apps/desktop` landing URL.
