# Agent Note: Matreshka website registration and Desktop handoff

Status: implemented

English | [中文](2026-09-20-matreshka-web-auth.zh.md)

## Problem

Operators could not create an account themselves. Desktop collected email and password in the app, so the public site could not be the place to register or sign in.

## Decision

The landing app serves `/login` and `/register`. Those pages call FastAPI `POST /v1/auth/login` and `POST /v1/auth/register`. With `?next=desktop`, a successful session mints `POST /v1/auth/desktop-code` and navigates to `matreshka://auth?code=`. Desktop exchanges the code for its own bearer. CLI `create-user` remains. Packaged Desktop shows only a website sign-in control. Unpackaged Desktop and the web GUI keep the password form (`MATRESHKA_LOCAL_LOGIN` can override).

The protocol URL carries a 60-second single-use Redis code, not the session bearer. Website and Desktop sessions are independent.

## Alternatives considered

- **Put the bearer in `matreshka://auth?token=`.** Rejected: browser history and OS logs would keep a live session secret.
- **Remove in-app login everywhere, including unpackaged.** Rejected: local development still needs email/password without a protocol round-trip.

## Consequences

Packaged Desktop needs a reachable landing origin (`MATRESHKA_LANDING_ORIGIN`, default `http://127.0.0.1:3020`). Existing CLI users still authenticate. Email verification is not part of this change.
