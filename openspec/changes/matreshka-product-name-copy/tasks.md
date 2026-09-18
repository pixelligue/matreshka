## 1. Desktop display name and shell copy

- [x] 1.1 Set electron-builder `productName` to `Matreshka` and leave `artifactName` as `deepseek-harness-…`, and verify a packaging unit test that the display name is Matreshka while the artifact stem still contains `deepseek-harness`
- [x] 1.2 Set `DSH_CLIENT_TITLE` to `Matreshka` in the official client build environment and verify `client-build-environment` tests plus assembled-boot/document-title expectations use Matreshka, not DeepSeek Harness
- [x] 1.3 Replace English and Chinese Desktop `startupFailed`, `startupLoading`, `updateTitle`, `updateDetail`, and `pluginWindowTitle` with Matreshka (keep `{version}`), and verify `startup-renderer` expected HTML and locale tests contain Matreshka and no DeepSeek Harness

## 2. Client copy

- [x] 2.1 Replace `welcomeBody` in en/ru/zh with short Matreshka alpha copy that does not mention DeepSeek Harness, DSH, or the Harness plugin ecosystem, and verify settings-models tests/fixtures no longer expect the old DSH paragraph
- [x] 2.2 Replace `webSearchDescription` in en/ru/zh with Matreshka web-search wording (no DeepSeek), and verify plugins locale tests or a grep that DeepSeek is absent from that key
- [x] 2.3 Set `hero.headline` / `hero.preview` to the design table (EN What should we do? / Alpha, RU Что сделаем? / Альфа, plus zh pair) and verify conversation locale tests and any HMR e2e needle no longer look for `Into the Unknown`

## 3. Rebuild check

- [x] 3.1 Rebuild ui-conversation, ui-settings-models, ui-settings-plugins client bundles and `apps/web` dist if those packages changed, and verify a grep of `apps/web/dist` plus Desktop locale sources for `DeepSeek Harness` on the five product seats is empty
