# Agent Note: Matreshka full-page sign-in

Status: implemented

English | [中文](2026-09-17-matreshka-full-page-sign-in.zh.md)

## Problem

Matreshka first-run used a floating onboarding dialog over the agent chrome. Operators saw the product UI before they had a session, could confuse the gate with the DeepSeek API-key dialog, and a stored session still painted the dialog for one credential round-trip.

## Decision

The Matreshka sign-in step on `settings.onboarding` is a full-viewport body portal. Application chrome is not visible behind it. `#root` is inert only while that page is painted. The step returns null until `credentials.describe` for `MATRESHKA_SESSION_TOKEN` settles, so a stored session never flashes the gate. Submit posts `{email,password}` to `{apiOrigin}/v1/auth/login` and stores the returned token under that reference. There is no skip.

Ordinary web e2e scenarios seed a dummy `MATRESHKA_SESSION_TOKEN` after Host boot so the gate does not block them. First-run scenarios pass `matreshkaSessionPending`. A Host test with a stored token sends `Authorization: Bearer` to `{apiOrigin}/v1/chat/completions`; a missing token sends no model HTTP request.

## Alternatives considered

**Stretch `OnboardingModal` / `Modal` to 100%.** The primitive card still sits in a padded, masked overlay, so the app remains visually present. A dedicated page owns the full-viewport contract without changing the welcome notice.

**A Client route outside `settings.onboarding`.** The coordinator already sequences the notice and a blocking first-run step and inerts the shell. A second composition path would duplicate that lifetime.

## Consequences

Welcome notice stays a small modal. DeepSeek API-key onboarding remains in the package source and is not registered in the Matreshka composition. GUI tests must not call a live login origin; Playwright fulfills `POST /v1/auth/login`.
