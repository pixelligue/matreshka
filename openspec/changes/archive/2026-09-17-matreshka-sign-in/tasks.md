## 1. Brand

- [x] 1.1 Add a Matreshka nesting-doll SVG and occupy `sidebar.brand.mark` / `sidebar.brand.name` for Matreshka client builds (not only `official`) and verify the sidebar name is Matreshka in a client spec
- [x] 1.2 Put all new brand-adjacent chrome copy in locale dictionaries (en+zh) and verify `verify-client-ui-i18n` would accept the new strings

## 2. Sign-in

- [x] 2.1 Add a blocking full-viewport onboarding page with email, password, submit, Matreshka mark, and no skip/sign-up, and verify a jsdom spec shows that page (not a floating dialog card) when no session exists
- [x] 2.2 On submit, `POST {apiOrigin}/v1/auth/login` and store `token` as `MATRESHKA_SESSION_TOKEN`; verify 200 dismisses the page and 401 keeps it with locale-owned error copy
- [x] 2.3 Stop registering DeepSeek API-key onboarding in the Matreshka composition and verify that dialog title is not shown
- [x] 2.4 Paint nothing and leave `#root` interactive while the session credential is still loading; verify a jsdom spec that a hung describe does not show the page or set inert

## 3. Host models

- [x] 3.1 Add Host config `apiOrigin` default `http://127.0.0.1:8016` and an llm-pi-ai `matreshka` route (`openai-completions`, `{apiOrigin}/v1`, `apiKeyEnv: MATRESHKA_SESSION_TOKEN`, two allowlisted model ids) and verify a Host test without a session does not send a model HTTP request
- [x] 3.2 Verify a Host test with a stored session token sends `Authorization: Bearer` to `{apiOrigin}/v1/chat/completions`

## 4. Snapshots and isolation

- [x] 4.1 Update web expected snapshots that still show DeepSeek API-key onboarding for the Matreshka composition
- [x] 4.2 Confirm Gonka keys are not written to desktop credentials and npm package names stay `@deepseek-ai/*`
