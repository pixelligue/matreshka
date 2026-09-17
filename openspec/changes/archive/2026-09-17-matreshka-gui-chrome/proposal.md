## Why

The Matreshka GUI still looks like DeepSeek Harness: the model picker lists DeepSeek and leftover Grok routes, copy is English/Chinese, workspace rows use the DSH folder glyph, and Cyrillic session titles show replacement diamonds in the list and the session header. Operators need a product chrome that matches Matreshka: one model, Russian plus English, and a readable header.

## What Changes

- Show only Matrena in the model picker for Matreshka desktop/web. Do not list DeepSeek-official catalog models or other `llm-pi-ai` providers.
- Add Russian as a product locale and keep English. The GUI default follows the OS language when it is Russian, otherwise English.
- Display session titles without replacement characters (`�`) in the workspace list and the session header.
- Replace the workspace-row folder glyph with the Matreshka nesting-doll mark.
- Tighten the session header so the title stays readable; mode and background-task chrome must not crowd or corrupt the title.

## Non-goals

- No backend, login, or Gonka-key changes.
- No npm package rename, no full visual restyle of the transcript or fish hero.
- No removal of Chinese dictionary files in this change; they are not product languages.
- No new folder artwork beyond the existing nesting-doll PNG (assumption: reuse `matreshka-logo.png` at the 16px workspace-row seat).
- Isolated `DSH_HOME` is an operator launch choice, not this change.

## Capabilities

### New Capabilities

- `client/matreshka-model-picker`: picker lists only Matrena.
- `client/matreshka-locale`: product copy in Russian and English.
- `client/matreshka-chrome`: workspace mark, session-title glyphs, header density.

### Modified Capabilities

- None. Main specs have no client GUI capabilities yet.

## Impact

- **Upstream seams:** `packages/bundle/base/cordis.patch.yml` (`llm-deepseek` row, `llm-pi-ai` providers), `packages/llm/llm-deepseek`, `packages/client/locale` (en/zh only today), `packages/client/ui-workspace` folder glyphs, session-title / conversation header packages (`ui-session`, `ui-conversation`, `ui-agent-preset`).
- Locale dictionaries and `verify-client-ui-i18n` (today en+zh). New `ru` dictionaries; snapshots that pin English chrome.
- Default model remains the Matreshka `matrena` route at `{apiOrigin}/v1`.
