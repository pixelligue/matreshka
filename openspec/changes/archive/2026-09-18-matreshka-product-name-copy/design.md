## Context

See proposal.md. Russian Desktop shell copy already says Matreshka. English and Chinese still say DeepSeek Harness. Packaged `productName` and `DSH_CLIENT_TITLE` are still DeepSeek Harness; Electron `app.name` on darwin menus uses `productName`. The main window title for the GUI document comes from `apps/web` Vite `DSH_CLIENT_TITLE` (default in `scripts/client-build-environment.ts`). `appId` is env `DSH_DESKTOP_APP_ID` (signing). Artifact files use `deepseek-harness-${version}-…`.

**Ownership:** Electron shell owns `productName` and `locale.ts`. Client build env owns the document title. ui-settings-models owns welcome copy. ui-settings-plugins owns `webSearchDescription`. ui-conversation owns `hero.*`.

## Goals / Non-Goals

**Goals:**

- One product string **Matreshka** on window, installer display name, and shell dialogs.
- Three GUI copy seats: welcome body, search description, hero headline + badge.

**Non-Goals:**

- Do not change `appId` or `artifactName`.
- Do not restyle EmptyHero beyond the two locale keys.

## Decisions

### 1. Display name only, not bundle id or file stem

`productName: 'Matreshka'`. Keep `artifactName: 'deepseek-harness-${version}-${os}-${arch}.${ext}'` so existing update YAML and operator folders keep working.

Alternative: rename artifacts to `matreshka-…` — rejected; that is a feed-breaking packaging change.

### 2. Document title via existing `DSH_CLIENT_TITLE`

Set official client build env `DSH_CLIENT_TITLE` to `Matreshka`. Rebuild `apps/web/dist` so Desktop picks it up. Tests in `client-build-environment.client.spec.ts` and assembled-boot that expect `DeepSeek Harness` follow.

### 3. Align en/zh Desktop messages with ru

Replace the five English/Chinese product sentences that contain DeepSeek Harness (`startupFailed`, `startupLoading`, `updateTitle`, `updateDetail`, `pluginWindowTitle`) with Matreshka equivalents already used in `ru`. Keep `{version}` in `updateDetail`.

### 4. Assumed GUI copy (override at apply if the operator prefers other wording)

Keep keys; change values in en/ru/zh together.

| Key | EN | RU |
|---|---|---|
| `welcomeTitle` | Internal Testing Notice (unchanged unless it names Harness) | unchanged |
| `welcomeBody` | Short Matreshka alpha notice. No DSH ecosystem paragraph. | Matching Russian |
| `webSearchDescription` | The Matreshka web search provider. | Провайдер веб-поиска Matreshka. |
| `hero.headline` | What should we do? | Что сделаем? |
| `hero.preview` | Alpha | Альфа |

Chinese values pair the same keys. `hero.preview` leaves the DSH Preview/Превью/预览版 triplet.

Alternative: headline = brand "Matreshka" — rejected; the mark already shows the doll.

### 5. Tests that pin old strings

Update, do not weaken: `apps/desktop/tests/startup-renderer.spec.ts`, packaging specs that assert `DeepSeek Harness.app` **display** name vs path. Path may still be `DeepSeek Harness.app` until `productName` changes — after the change the `.app` folder is `Matreshka.app`. Update those path assertions. `windows-sign` fixture paths that are fake may stay or follow productName if they encode the display exe name.

HMR e2e that searches `'hero.headline': 'Into the Unknown'` must use the new English headline.

## Risks / Trade-offs

- **[Risk] macOS/Windows tests hardcode `DeepSeek Harness.app` / `.exe`.** → Update assertions in the same change; unsigned local dirs under `apps/desktop/build/` stay untracked.
- **[Risk] Welcome still appears before or after sign-in.** → Copy change only; do not retune onboarding order.
- **[Trade-off] Search settings card still has an API-key field for the old DeepSeek provider UI.** → Description only in this change.
- **[Trade-off] File downloads still named `deepseek-harness-*.exe`.** → Display name is Matreshka; filename stays stable for feeds.

## Migration Plan

Unpackaged: rebuild web frontend after `DSH_CLIENT_TITLE` change, restart Desktop. Packaged: next Matreshka build. Rollback: revert the string files.

## Open Questions

None. Hero/welcome wording is assumed in Decision 4; change values at apply if needed, not the keys.
