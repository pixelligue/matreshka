## Context

See proposal.md. Today the base bundle still mounts `llm-deepseek` with the four-model official catalog, and `llm-pi-ai` settings from `$DSH_HOME/settings.yaml` overlay extra providers (Grok). Client dictionaries are zh-keyed with English counterparts; `verify-client-ui-i18n` does not require Russian. Workspace rows use `IconFolderClose16` / `IconFolderOpen16`. Session titles render in `ui-workspace` rows and the session header (`ui-session` / `ui-subagent` lineage + `ui-agent-preset` “Standard mode”).

**Ownership:** Host composition (which adapters exist) vs Client chrome (picker, locale, rows, header). Backend unchanged.

## Goals / Non-Goals

**Goals:**

- Composition so the picker can only resolve Matrena.
- `ru` + `en` as product languages.
- Nesting-doll mark on workspace rows; intact Cyrillic titles; header that does not fight the title.

**Non-Goals:**

- Do not delete zh dictionary files.
- Do not restyle the transcript or fish hero.
- Do not change login or the Matreshka `/v1` route.

## Decisions

### 1. Hide extra providers in composition, not in the picker widget

Disable the `llm-deepseek` plugin row in the Matreshka base/web composition. Keep `llm-pi-ai` with only `providers.matreshka` / `matrena`. When loading `llm-pi-ai` settings, drop every provider key other than `matreshka` so a leftover Grok block in `settings.yaml` cannot reappear.

Alternative: filter in the Client picker — rejected; a hidden adapter can still be selected via settings or default-model.

### 2. Add `ru` beside existing `en`/`zh` dictionaries

Keep zh as the compile-time key-set source (existing convention). Add a complete `ru` object in each product-visible dictionary. Extend `verify-client-ui-i18n` so missing `ru` fails. The language row offers Russian and English only. Default: OS `ru*` → Russian, else English; persist the override in the existing locale setting.

Alternative: replace zh with ru as the key-set source — rejected; too large a gate rewrite for this change.

### 3. Truncation is CSS, not a UTF-16 slice

Session list and header titles use CSS `text-overflow: ellipsis` on the full stored string. Do not `substring` titles. If a title already contains U+FFFD in the log, still render it, but this change must not introduce U+FFFD at display time.

### 4. Workspace mark reuses the nesting-doll PNG

`ui-workspace` project rows render `/matreshka-logo.png` at 16px instead of the folder glyphs. Ungrouped stays a label without that mark.

Alternative: new folder SVG — rejected until the operator supplies art.

### 5. Header: title is the flex primary

Give the title `min-width: 0` and ellipsis; keep preset and background-task controls as trailing, shrinking chrome so they cannot overlap the title. Do not remove those controls.

## Risks / Trade-offs

- **[Risk] `verify-client-ui-i18n` plus many `locales.ts` files.** → Add `ru` only for product-visible namespaces this change touches if the gate can be scoped; otherwise fill every existing dictionary in the same PR.
- **[Risk] Disabling `llm-deepseek` breaks snapshots that assume DeepSeek onboarding.** → Update Matreshka composition snapshots only; leave CLI/SDK DeepSeek profiles alone.
- **[Trade-off] zh remains in source.** → Product picker does not offer Chinese.

## Migration Plan

Operators on an old `$DSH_HOME` keep Grok in the file on disk; the Matreshka host ignores it. No data migration.

## Open Questions

None that block planning. Exact CSS for the header trailing cluster is apply-time.
