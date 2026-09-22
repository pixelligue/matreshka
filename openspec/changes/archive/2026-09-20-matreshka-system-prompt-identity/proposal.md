# Proposal

## Why

Matreshka Desktop still sends the model `You are an AI agent powered by DeepSeek Harness.` The operator never sees that row, but Matrena can name DeepSeek Harness in replies. The GUI already presents Matreshka; the model-facing opener should match.

## What Changes

- The Matreshka web-app composition turns off the fixed DeepSeek Harness identity (`includeHarnessIdentity: false`).
- Model-visible web-app prompt sections and the `DSH_WEB_URL` bash description name Matreshka, not DeepSeek Harness.
- The deployment persona prefix stays `You are a coding agent powered by the {{model}} model.` (`matrena` in this product).

## Non-goals

- No rewrite of `@deepseek-ai/dsh-system-prompt` defaults, CLI/headless/ACP profiles, or recorded snapshots of those profiles.
- No PWA, CLI help, docs-site, or npm package rename.
- No change to the hidden Cordis/Creator preset persona.
- No UI copy change (already Matreshka).

## Capabilities

### New Capabilities

- `host/matreshka-system-prompt`: Matreshka Host sessions omit the DeepSeek Harness identity and do not send DeepSeek Harness as the product name in Host-owned prompt sections.

### Modified Capabilities

- None.

## Impact

- **Upstream seam:** `packages/bundle/web-app/cordis.patch.yml` (`system-prompt` config) and `packages/bundle/web-app/src/index.ts` (source and web-surface sections).
- Desktop and `dsh web` both load this patch. Other `dsh` profiles keep the upstream opener.
- New sessions pick this up after Host restart. Existing session logs keep prior system-prompt events.
