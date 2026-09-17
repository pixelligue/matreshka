## 1. Empty-session chrome

- [x] 1.1 Translate `ui-conversation` `ru` values (hero headline, preview badge, composer placeholders, and remaining product copy) and verify a jsdom spec with locale `ru` does not show `Into the Unknown`, `Preview`, or the English hero placeholder
- [x] 1.2 Translate `ui-workspace` `ru` values (section heading, per-workspace New Session, search, menus) and verify a jsdom spec with locale `ru` does not show `Workspaces` or `New Session`
- [x] 1.3 Translate `ui-agent-preset` `ru` values including `presetStandardName` and verify a jsdom spec with locale `ru` does not show `Standard mode`
- [x] 1.4 Translate `ui-permission-presets` `ru` and `accessRu` values including `preset.workspaceWrite` and verify a jsdom spec with locale `ru` does not show `Workspace Write`

## 2. Remaining Client dictionaries

- [x] 2.1 Translate `packages/client/ui-chat/src/client/locale.ts` `ru` values, keep language-neutral tokens and `{placeholder}` names, and verify the chat dictionary key set still matches `zh`/`en`
- [x] 2.2 Translate remaining `packages/client/**/locales.ts` `ru` objects (settings, trajectory, sidebars, tools, jobs, plan, goal, commands, and nested document-preview namespaces), leave already-Russian sidebar/settings/sign-in strings, and verify no product-copy `ru` value still equals its `en` string
- [x] 2.3 Translate `extensions/ui-cordis`, `experimental/client-ui-agent-team`, and `session-query/session-log-export` `ru` dictionaries the same way and verify they register complete `ru` key sets

## 3. Desktop shell

- [x] 3.1 Add a complete `ru` dictionary to `apps/desktop/src/locale.ts`, resolve `ru*` OS locales to it, keep `zh*` → Chinese and other locales → English, and verify `apps/desktop/tests/locale.spec.ts` asserts `ru-RU` is not `Application` while `en-US` stays English

## 4. Verification gate

- [x] 4.1 Extend `scripts/locale-dictionary-parity.spec.ts` (or a sibling scripts spec) so every `zh`/`en` pair has a `ru` counterpart with the same keys, `{placeholder}` names match English, and `ru === en` is allowed only for an explicit language-neutral allowlist, and verify the gate fails on a clone such as `Workspaces` and passes for tokens such as `HTTP` and `px`
- [x] 4.2 Write an Agent Note for the ru-copy gate and allowlist rule, and verify the note follows the Agent Note format

## 5. Locale-scoped tests

- [x] 5.1 Extend Client jsdom coverage so an active `ru` locale renders the empty-session chrome in Russian, and verify existing English-pinned cases still pass without re-recording snapshots unless a case asserts Russian
