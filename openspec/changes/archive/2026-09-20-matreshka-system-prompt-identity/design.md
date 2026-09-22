# Design

## Context

See proposal.md. `@deepseek-ai/dsh-system-prompt` already supports `includeHarnessIdentity: false`. The Matreshka web-app patch already restates `personaPrefix` / `personaSuffix` and is the Host composition for Desktop and `dsh web`. Ownership: Host composition (web-app patch + glue plugin). No FastAPI change.

## Goals / Non-Goals

**Goals:** Omit the identity opener in the Matreshka composition; name Matreshka in Host-owned source and web-surface sections.

**Non-Goals:** Changing the core plugin default, other `dsh` profiles, or the hidden Cordis preset.

## Decisions

### 1. Overlay `includeHarnessIdentity: false`, do not rewrite the core opener

The core plugin keeps `You are an AI agent powered by DeepSeek Harness.` for upstream profiles and snapshots. Matreshka sets `includeHarnessIdentity: false` on the existing `system-prompt` row in `packages/bundle/web-app/cordis.patch.yml` (the patch restates the whole config, so prefix and suffix stay).

Alternative: change the core string. Rejected: it would rewrite every profile and recorded snapshot.

### 2. Replace web-app source/surface copy, not `addHarnessSourceSection`

`addHarnessSourceSection` in app-boot is shared. The web-app glue plugin registers `harness:source` and `app:web-surface` with Matreshka wording instead of calling that helper.

Desktop disables `web-runtime`, so those two sections may be absent there; the identity flag still applies because `system-prompt` is a host row.

## Risks / Trade-offs

- **[Risk] Existing sessions keep the old opener in the log.** → New sessions after Host restart. No log rewrite.
- **[Trade-off] Cordis preset still mentions DeepSeek Harness.** → Hidden in Matreshka; all sessions run Standard.
- **[Trade-off] CLI/headless keep the upstream opener.** → Intended. Those profiles are not the product GUI.

## Migration Plan

Restart unpackaged Desktop or `dsh web`. Rollback: restore `includeHarnessIdentity` default and the previous section strings.

## Open Questions

None.
