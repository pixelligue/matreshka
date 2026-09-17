## Context

See proposal.md. Auth already stores Redis sessions; the spec mentioned logout but the route was never added. Search already uses Keenable public. Fetch is still `web-fetch-http`. **Ownership:** backend auth for revoke; client settings for Sign out; Host `web-search-matreshka` for Keenable fetch.

## Goals / Non-Goals

**Goals:**

- Revoke session on the server and locally; show sign-in again.
- Default `web_fetch` goes through Keenable public fetch.

**Non-Goals:**

- Do not add models. Do not replace Keenable search.

## Decisions

### 1. Idempotent logout, then reload

`POST /v1/auth/logout` deletes `session:{token}` when present and always returns 204 so the GUI is not stuck if Redis already dropped the key. The Sign out row lives in Settings → General (owned by `ui-settings-models`, which already has credential operations and `apiOrigin`). After unset, `window.location.reload()` re-runs onboarding so the blocking sign-in page returns. Alternative: reset onboarding without reload — rejected; reload is one path and matches “session gone ⇒ first launch”.

### 2. Keenable fetch in the existing search package

Add `KeenableFetchProvider` (`id: keenable`) next to search in `@deepseek-ai/dsh-web-search-matreshka`. Public URL `GET https://api.keenable.ai/v1/fetch/public?url=&live=true`, `redirect: 'error'`. Markdown `content` maps to `{ kind: 'text', content }`. Non-2xx becomes a fetch result with that status when a body is present; network failure is `WEB_PROVIDER_ERROR`. web-app sets `fetchProvider: keenable`. HTTP fetch stays mounted for operators who pin it.

## Risks / Trade-offs

- **[Risk] Keenable cannot fetch private/localhost URLs.** → HTTP provider remains; default is public-web fetch, which matches `web_fetch`.
- **[Trade-off] Reload after logout drops unsaved UI state.** → Session is gone; chrome must not stay usable.

## Migration Plan

None for sessions: old tokens stay valid until TTL unless the operator signs out.

## Open Questions

None.
