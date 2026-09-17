## Why

The GUI already defaults to Russian and registers `ru` dictionaries, but most `ru` values are English clones. On a Russian OS the empty session still shows mixed chrome: Workspaces, New Session, Into the Unknown, Preview, Standard mode, Workspace Write, the composer placeholder, and the Desktop Application menu. `matreshka-gui-chrome` added the locale seat; this change fills the copy.

## What Changes

- Replace English-clone `ru` values in every registered Client dictionary with Russian product wording (conversation, workspace, presets, permission modes, settings, chat, trajectory, and remaining client/extension namespaces).
- Add a complete Russian Desktop Electron dictionary in `apps/desktop/src/locale.ts` and resolve `ru*` OS locales to it (today only `zh*` vs English).
- Keep `{placeholder}` tokens identical to `en`/`zh`. Leave language-neutral tokens untranslated (tool names, `HTTP`, `px`, `PTC`, `EXP`, file types). Brand names Matreshka and Matrena stay as-is.
- Fail CI when a `ru` dictionary is missing, drifts in keys, or copies English except for an explicit language-neutral allowlist.
- Update Client and Desktop tests that pin English chrome while the active locale is Russian.

## Non-goals

- No change to default-language rules, the language picker, or zh dictionaries.
- No translation of docs, comments, Agent Notes, CLI, TUI, model prompts, or user/workspace/session names.
- No restyle, rebrand, or package rename.
- No backend, auth, or model-routing work.

## Capabilities

### New Capabilities

- `client/matreshka-locale`: product-visible Russian copy is actual Russian wording in Client dictionaries and the Desktop shell.

### Modified Capabilities

- None. Main specs have no client locale capability yet (`matreshka-gui-chrome` introduced the same path as an unarchived delta for language seating).

## Impact

- **Upstream seams:** Client locale dictionaries (`packages/client/**/locales.ts`, `ui-chat/src/client/locale.ts`), `extensions/ui-cordis`, `experimental/client-ui-agent-team`, `session-query/session-log-export`, Desktop `apps/desktop/src/locale.ts`.
- `scripts/locale-dictionary-parity.spec.ts` (zh/en keys only today) plus a ru-copy gate.
- jsdom specs and web snapshots that pin English strings under an active `ru` locale.
