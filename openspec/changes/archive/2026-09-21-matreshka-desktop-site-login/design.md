# Design

## Context

See proposal.md. Unpackaged Desktop currently defaults `desktopLocalLogin()` to `!app.isPackaged`, so the overlay still collects a password. The public site already owns register and login.

## Goals / Non-Goals

**Goals:** Desktop overlay is website-only by default.

**Non-Goals:** Removing landing forms. Changing `matreshka://`.

## Decisions

### 1. Default local login off

`desktopLocalLogin()` is true only when `MATRESHKA_LOCAL_LOGIN=1`. Unpackaged and packaged both open the site. The web GUI has no `dshDesktop.auth` and keeps the password form.

If the auth bridge exists and `localLogin()` fails, the overlay stays on website mode, not the password form.

## Risks / Trade-offs

- **[Risk] Unpackaged protocol registration is flaky on Windows.** → Operator can retry; Desktop must stay running to receive `matreshka://`.
- **[Trade-off] Dev still needs a password form sometimes.** → `MATRESHKA_LOCAL_LOGIN=1`.

## Migration Plan

Rebuild Desktop `lib/` and restart. Rollback: restore `!app.isPackaged` default.

## Open Questions

None.
