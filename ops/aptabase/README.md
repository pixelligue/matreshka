# Local Aptabase for Matreshka Desktop

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

`AUTH_SECRET` must be at least 32 bytes (HS256). Change the compose passwords and `AUTH_SECRET` before any non-loopback bind.
