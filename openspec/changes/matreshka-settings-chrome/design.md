## Context

See proposal.md. `ui-settings-general` already hides Models, Plugins, Agent presets, and Archived sessions through `hiddenSectionIds` in `packages/bundle/web-app/cordis.patch.yml`. `SettingsRoot` still always paints a 188px `.nav` and an 800×800 `.panel`. Loopback Hosts register `SettingsDocumentAction` on `settings.action`.

## Goals / Non-Goals

**Goals:** Compact single-section layout; hide the document action in the Matreshka composition.

**Non-Goals:** Un-hiding other sections; restyling each General row’s internals.

## Decisions

### 1. Collapse the nav when `rows.length <= 1`

`SettingsPanel` omits `.nav` in that case and renders the header slot in `.header` next to Close. Multiple visible sections keep the current rail.

### 2. Compact panel class for one section

A modifier on `.panel` (about 560px wide, height from content, `max-height: calc(100vh - 48px)`, panel scrolls if the list is taller). Multi-section keeps the fixed 800 frame so switching sections does not resize under the pointer.

### 3. `documentAction` config, off by default

Add `documentAction: z.boolean().default(false)` on `ui-settings-general` `Config` (same pattern as the existing `hiddenSectionIds` default). Register `SettingsDocumentAction` only when loopback **and** `documentAction` is true. The web-app patch also sets `documentAction: false` so the composition file matches the schema default. Whole-client tests do not pass YAML `config` into `apply()`, so the Zod default is the product default.

### 4. Keep General row components

Permissions, language, appearance cubes, font size, transcript, enter-while-busy, and Sign out stay as they are. The shell change is the design delta.

## Risks / Trade-offs

- **[Risk] Tests that assemble `webApp` expect `settings.action`.** → Update those assertions to match `documentAction: false`.
- **[Trade-off] Un-hiding Models later needs the 800 two-column frame again.** → The `rows.length > 1` branch stays.

## Migration Plan

Rebuild `@deepseek-ai/dsh-client-ui-settings-general` and `@deepseek-ai/dsh-web-frontend`, restart Desktop. Rollback: revert Config and CSS.

## Open Questions

None.
