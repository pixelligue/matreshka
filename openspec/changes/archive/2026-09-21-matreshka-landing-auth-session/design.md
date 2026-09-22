# Design

## Context

See proposal.md. Auth pages already call FastAPI login/register and mint `desktop-code` when `next=desktop`. They do not persist the token. Desktop currently opens `/login?next=desktop`.

## Goals / Non-Goals

**Goals:** Register-first Desktop handoff; remember the site session across refresh; auto-handoff when a session already exists.

**Non-Goals:** HttpOnly cookies, email verify, changing FastAPI tokens.

## Decisions

### 1. `localStorage` bearer for the marketing origin

Key `matreshka.landing.session` holds `{ token, email }`. Same-origin only. Sign out removes it. Private-mode write failures leave the visitor signed in for that tab only.

### 2. Desktop opens register, not login

New operators land on `/register?next=desktop`. Existing operators use “Already have an account?” or a stored session auto-handoff.

## Risks / Trade-offs

- **[Risk] XSS on the landing origin can read the bearer.** → Accept for this origin; Desktop still uses a one-time code.
- **[Trade-off] Register is the default Desktop URL.** → Returning users with a stored session skip the form.

## Migration Plan

Reload landing and restart Desktop. Rollback: open `/login` again and stop writing `localStorage`.

## Open Questions

None.
