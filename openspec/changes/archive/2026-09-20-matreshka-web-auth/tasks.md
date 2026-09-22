## 1. API

- [x] 1.1 Add `POST /v1/auth/register` (201 token, 409 duplicate, 400 invalid) and verify pytest covers create, duplicate, and login after register
- [x] 1.2 Add `POST /v1/auth/desktop-code` and `POST /v1/auth/exchange` (60s single-use Redis code, new Desktop session) and verify 401 without bearer, reuse, and protected-route access after exchange

## 2. Landing

- [x] 2.1 Add locale-owned `/login` and `/register` (and `/en/…`) that call the API, and verify both routes render without a Desktop session
- [x] 2.2 On success with `next=desktop`, mint a desktop code and navigate to `matreshka://auth?code=`, and verify the handoff URL has the code and not the bearer

## 3. Desktop and overlay

- [x] 3.1 Register `matreshka://`, parse `auth?code=`, focus the existing instance, IPC the code to the renderer, and verify parser tests plus second-instance delivery
- [x] 3.2 Packaged overlay: website control only; unpackaged and web GUI: keep email/password; exchange stores the session token; verify client tests for both modes
