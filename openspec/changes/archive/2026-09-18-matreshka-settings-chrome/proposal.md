## Why

The Settings dialog still uses the DeepSeek Harness two-column shell: an 800×800 panel, a 188px nav rail, and “Open configuration file”. Matreshka already hides Models, Plugins, Agent presets, and Archived sessions, so the rail is an empty title column. The list of General rows sits in leftover space and looks like an unfinished operator screen.

## What Changes

- When only one settings section is visible, the dialog MUST NOT paint a nav rail. The title sits on one row with Close.
- The panel MUST be compact (content-sized, not a fixed 800×800 frame) while only General is shown.
- The “Open configuration file” header action MUST NOT appear in the Matreshka composition.
- General rows (permissions, language, appearance, font, transcript, send-while-busy, sign out) keep their controls. Copy stays locale-owned.

## Non-goals

- No restyle of Chat, sidebar, or the empty-session hero.
- No new settings sections and no un-hiding Models/Plugins/Archived sessions.
- No change to Sign out behavior or to Host settings files on disk.
- No Excel/Word/PDF skill pack.

## Capabilities

### New Capabilities

- `client/matreshka-settings-shell`: compact single-section Settings dialog without a nav rail or open-document action.

### Modified Capabilities

- None.

## Impact

- Upstream seam: `@deepseek-ai/dsh-client-ui-settings-general` (`SettingsRoot` layout, `Config` for the document action) and `packages/bundle/web-app/cordis.patch.yml`.
- Tests: `settings-root.client.spec.tsx` (single-section layout, no empty rail), apply/shell specs for the document-action config.
