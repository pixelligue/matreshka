## Context

See proposal.md. `ui-agent-preset` registers a hero chip and a header label. Unpackaged Desktop runs `apps/desktop/lib/main.js`.

## Goals / Non-Goals

**Goals:** Hide preset chrome; make the Windows Application menu actually gone in unpackaged Desktop.

**Non-Goals:** Changing which preset the host applies.

## Decisions

### 1. `sessionChrome` config, off in the web-app patch

Default false: browser plugins do not receive YAML `config` (same as `documentAction`). Isolated tests that need the chip pass `sessionChrome: true`. The seat still applies the default preset.

### 2. Rebuild Desktop lib after menu edits

`start:desktop --skip-build` does not compile `main.ts`. Menu hiding must be in `lib/main.js`.

## Risks / Trade-offs

- **[Trade-off] No GUI to pick PTC/Minimal/Creator.** → Intended.

## Migration Plan

Bundle `ui-agent-preset`, rebuild web frontend, rebuild `dsh-desktop`, restart Desktop.

## Open Questions

None.
