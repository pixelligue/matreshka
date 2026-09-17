## Context

See proposal.md. Packaged Desktop already uses electron-updater with `autoDownload: false`, a 10s check, and a native confirm dialog. The feed URL is baked as electron-builder `publish: [{ provider: 'generic', url }]` from `resolveDesktopAutoUpdateConfig`, which hardcodes production `https://download.deepseek.com/_/harness/desktop/stable/{target}/`. COS upload is a separate command. **Ownership:** Electron shell (`apps/desktop`) owns the feed URL and check/install UX. FastAPI (`backend/`) owns serving and the publish CLI.

## Goals / Non-Goals

**Goals:**

- Same generic YAML protocol, new origin and path.
- Backend can host a target directory and copy a packaged output into it.

**Non-Goals:**

- Do not replace electron-updater or the confirm dialog.
- Do not keep COS as a Matreshka publish path.

## Decisions

### 1. Reuse generic provider, change only the URL

electron-updater already parses `latest.yml` / `latest-mac.yml` plus sha512. A custom JSON API would fork the client. Keep generic GET.

Path: `{apiOrigin}/v1/updates/desktop/{target}/` instead of `_/harness/desktop/stable/{target}/` so it sits next to `/v1/auth` and `/v1/chat`.

Alternative: GitHub Releases provider — rejected; updates must come from our API.

### 2. Same origin as sign-in, HTTP allowed

Default `http://127.0.0.1:8016`. Packaging currently rejects non-HTTPS origins. Relax that for Matreshka so a local packaged build can hit the API. Production can still use HTTPS by setting the origin.

Runtime `setFeedURL` to `{apiOrigin}/v1/updates/desktop/{target}/` so a Host `apiOrigin` override and the baked `app-update.yml` stay aligned (default is enough when Host config is the same string).

### 3. Public GET, filesystem publish

Updates must work with no session (expired token, first launch after install). Trust is the signed Desktop artifact, not a bearer cookie.

`UPDATE_ARTIFACT_ROOT` is optional so chat-only local API still boots. Publish is `matreshka-api publish-desktop`, not PUT, so we do not add an authenticated write API in this change.

Layout: `{root}/{target}/latest.yml` (Windows) or `latest-mac.yml` (mac) plus sibling artifact files. Resolve `{name}` with a single-segment check so `..` cannot escape the target dir.

### 4. Leave COS upload code in the tree, unused

Rewiring `desktop-upload-plan.ts` to the API is extra scope. Packaging `publish.url` changes; operators use the CLI. COS scripts can stay until a later deletion change.

## Risks / Trade-offs

- **[Risk] Serving installers over HTTP on loopback is fine; a public HTTP origin is MITM-able.** → Signed artifacts still verify; operators who need TLS terminate in front of FastAPI later.
- **[Risk] Optional artifact root means a misconfigured production API 404s the updater.** → README names `UPDATE_ARTIFACT_ROOT`; Desktop already surfaces updater errors.
- **[Trade-off] Two YAML keys (channel file + artifacts) copied as a unit.** → Matches electron-builder output; CLI copies the named set.

## Migration Plan

Existing packaged DeepSeek builds keep hitting COS until operators install a Matreshka build produced with the new feed URL. No session-format change.

## Open Questions

None.
