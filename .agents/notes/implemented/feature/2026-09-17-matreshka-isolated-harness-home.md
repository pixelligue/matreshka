# Agent Note: Matreshka isolated harness home

Status: implemented

English | [中文](2026-09-17-matreshka-isolated-harness-home.zh.md)

## Problem

Matreshka and DeepSeek Harness both resolved an unset `$DSH_HOME` to `~/.dsh`. One `settings.yaml` then held Grok as the default model while `.credentials.yaml` held `MATRESHKA_SESSION_TOKEN`. Opening a Matreshka workspace in ordinary DSH sent the round to `grok` / `XAI_API_KEY`; launching Matreshka against the same home could pick up that leftover Grok block. Filtering extra providers in composition does not split sessions, credentials, or the default-model overlay.

## Decision

`DSH_HOME_DIR_NAME` in `@deepseek-ai/dsh-home-paths` is `.matreshka`. Precedence is unchanged: explicit configured path, then `$DSH_HOME`, then `~/.matreshka`. DeepSeek Harness keeps `~/.dsh`. The resolver policy remains [one harness home resolver](../architecture/2026-07-24-single-harness-home-resolver.md). There is no automatic copy from `~/.dsh`: a shared-home copy would re-couple the products. An operator who already signed in under `~/.dsh` copies only `MATRESHKA_SESSION_TOKEN` into `~/.matreshka/.credentials.yaml`.

## Alternatives considered

**Keep `~/.dsh` and set `$DSH_HOME` only in launch scripts.** `pnpm dsh web`, the desktop host, and any process that forgets the wrapper would still land on DeepSeek Harness data.

**Add `MATRESHKA_HOME` beside `$DSH_HOME`.** A second variable splits the single-root resolver without removing the collision when both products leave the environment unset.

**Share the home and drop every non-`matreshka` provider from settings.** Sessions, credentials, and `agent-default-model` would still mix; ordinary DSH would lose its Grok overlay when Matreshka saved settings.

## Consequences

- A Matreshka launch with no `$DSH_HOME` writes settings, credentials, and sessions under `~/.matreshka`.
- Ordinary DSH Grok keys and sessions stay in `~/.dsh`.
- An exported `$DSH_HOME` pointing at `~/.dsh` still shares the home; unset it when launching Matreshka.
