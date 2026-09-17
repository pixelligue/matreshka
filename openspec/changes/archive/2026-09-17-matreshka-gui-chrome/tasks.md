## 1. Model picker

- [x] 1.1 Disable `llm-deepseek` in the Matreshka desktop/web composition and keep `llm-pi-ai` on `matreshka` / `matrena` only, and verify a Host catalog test lists that single model
- [x] 1.2 Ignore non-`matreshka` keys under `llm-pi-ai` settings so a leftover Grok block cannot register, and verify a Host test with Grok in settings.yaml still exposes only Matrena
- [x] 1.3 Point `agent-default-model` at `matreshka` / `matrena` and verify a Client picker spec shows one option named Matrena

## 2. Locale

- [x] 2.1 Add complete `ru` dictionaries next to existing `en`/`zh` for product-visible namespaces and verify `verify-client-ui-i18n` requires `ru`
- [x] 2.2 Offer only Russian and English in the language row, default `ru*` OS to Russian otherwise English, persist the override, and verify a jsdom spec switches chrome without restart

## 3. Chrome

- [x] 3.1 Render `/matreshka-logo.png` at 16px on workspace rows instead of folder-open/close glyphs and verify a `ui-workspace` row spec
- [x] 3.2 Truncate session titles with CSS ellipsis on the full stored string (no UTF-16 slice) in the list and header, and verify a spec with a Cyrillic title contains no U+FFFD
- [x] 3.3 Make the session title the flex primary in the header with preset and background-task chrome trailing, and verify a layout spec that a long title does not overlap those controls

## 4. Snapshots

- [x] 4.1 Update Matreshka web snapshots that still show DeepSeek models, Chinese-only chrome, or folder glyphs, and verify `DSH_SNAPSHOT=replay pnpm run test:web` for the touched cases
