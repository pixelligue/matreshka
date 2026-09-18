## Why

Operators still see DeepSeek Harness on the window, installer, startup/update/plugin chrome (English and Chinese), the settings welcome notice, the web-search plugin blurb, and the empty-session hero. The sidebar already says Matreshka. Those leftover strings should match.

## What Changes

- Electron `productName` and the loaded document title (`DSH_CLIENT_TITLE`) are **Matreshka**. The OS window and the packaged installer display name follow that.
- Desktop English and Chinese dictionaries replace every "DeepSeek Harness" product string (startup, update dialog, plugin window title) with Matreshka, matching the existing Russian dictionary.
- Settings welcome `welcomeBody` (and its title if it still names Harness) is Matreshka product copy in en/ru/zh. It MUST NOT describe the DSH plugin ecosystem.
- Plugins web-search description MUST NOT say "DeepSeek search provider". It names Matreshka web search.
- Empty-session `hero.headline` MUST NOT be "Into the Unknown" / "В неизвестность" / "探索未至之境". `hero.preview` is locale-owned Matreshka badge copy, not the DSH "Preview" tagline pair.

Chinese dictionaries stay in the tree and keep the same keys (pairing). Product languages remain Russian and English.

## Non-goals

- No `appId`, no installer **filename** (`artifactName` stays `deepseek-harness-…`), no npm package rename.
- No website, CLI, PWA-manifest-only, or docs-site rebrand.
- No theme, layout, hero animation, or transcript restyle.
- No agent loop, tools, models, or backend.
- The DeepSeek API-key onboarding page stays absent (already specified). Do not rebuild the plugins search-key form in this change.

## Capabilities

### New Capabilities

- `desktop/product-name`: packaged and unpackaged Desktop present as Matreshka in the window, installer display name, and shell dictionaries.
- `client/matreshka-copy`: welcome notice, web-search description, and empty-session hero strings are Matreshka copy.

### Modified Capabilities

- None. `client/matreshka-brand` already covers the sidebar mark and name; this change does not rewrite that requirement.

## Impact

- **Upstream seams:** `apps/desktop/electron-builder.config.mjs` (`productName`), `scripts/client-build-environment.ts` (`DSH_CLIENT_TITLE`), `apps/desktop/src/locale.ts`, `packages/client/ui-settings-models` welcome copy, `packages/client/ui-settings-plugins` `webSearchDescription`, `packages/client/ui-conversation` `hero.headline` / `hero.preview`.
- Tests that pin "DeepSeek Harness" in startup HTML, packaging app path, client title, welcome fixtures, and hero HMR must follow the new strings.
