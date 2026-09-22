## 1. Host composition

- [x] 1.1 Set `includeHarnessIdentity: false` on the web-app `system-prompt` row (restating persona prefix and suffix) and verify the patch test asserts that flag and no `DeepSeek Harness` in the YAML
- [x] 1.2 Register Matreshka wording for `harness:source`, `app:web-surface`, and the `DSH_WEB_URL` description in the web-app glue plugin, and verify web-app tests reject `DeepSeek` in those sections
