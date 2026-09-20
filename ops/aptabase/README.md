# Local Aptabase for Matreshka Desktop

English | [中文](README.zh.md)

Self-hosted Aptabase for Desktop product analytics. Unpackaged Desktop traffic is **Debug**. The server flushes events to ClickHouse about every **ten seconds**.

## Start

```sh
docker compose -f ops/aptabase/docker-compose.yml up -d
```

Open `http://127.0.0.1:8000`. There is no default account. Register, then take the activation link from:

```sh
docker compose -f ops/aptabase/docker-compose.yml logs aptabase
```

Create an app, copy the `A-SH-` App Key.

## Point Desktop at it

```sh
set MATRESHKA_APTABASE_APP_KEY=A-SH-your-key
set MATRESHKA_APTABASE_HOST=http://127.0.0.1:8000
pnpm run start:desktop
```

On POSIX use `export` instead of `set`.

## Confirm events

1. Sign in, send a message, open Settings.
2. In the dashboard, switch to **Debug** (bug icon), not Release.
3. Wait at least ten seconds.
4. Live View shows `app_started` and `ui_*` events. OS and Version widgets use `systemProps`.

## Model and tool usage

Create a second Aptabase app for server usage events. Set `MATRESHKA_APTABASE_USAGE_APP_KEY` to that app's `A-SH-` key in `backend/.env`; `MATRESHKA_APTABASE_HOST` uses this instance's origin and defaults to `http://127.0.0.1:8000`. Restart the API. New `upstream_usage` events appear in that app's Live View with operation, provider, model, tokens, and known charge. They contain no user identity or request text. A separate app keeps server events out of Desktop session metrics.

Aptabase shows event counts and categories. For exact RUB and USD totals, open the API's [operator cost report](../../backend/README.md) at `http://127.0.0.1:8016/analytics/costs` and sign in with a Matreshka API account. Reported charges, rate estimates, and unknown costs remain separate there.

`AUTH_SECRET` must be at least 32 bytes (HS256). Change the compose passwords and `AUTH_SECRET` before any non-loopback bind.
