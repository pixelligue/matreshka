# Agent Note: Matreshka system-prompt identity

Status: implemented

English | [中文](2026-09-20-matreshka-system-prompt-identity.zh.md)

## Problem

Matreshka GUI copy already says Matreshka, but each Host session still opened with `You are an AI agent powered by DeepSeek Harness.` That row is hidden from Chat, yet the model can name DeepSeek Harness in replies. Web-app source and GUI orientation sections used the same product name.

## Decision

The Matreshka web-app composition owns identity. `system-prompt` sets `includeHarnessIdentity: false` so the core opener is omitted; `personaPrefix` remains `You are a coding agent powered by the {{model}} model.` The web-app glue plugin registers `harness:source` and `app:web-surface` with Matreshka wording instead of calling `addHarnessSourceSection`, and the `DSH_WEB_URL` bash description names the Matreshka GUI.

The core `@deepseek-ai/dsh-system-prompt` default opener is unchanged. CLI, headless, ACP, and recorded snapshots of those profiles keep the upstream identity.

## Alternatives considered

- **Change the core identity string.** Rejected: every non-Matreshka profile and its snapshots would move with a product overlay.
- **Leave source and web-surface text.** Rejected: those Host-owned sections would still name DeepSeek Harness after the opener was removed.

## Consequences

New Matreshka Desktop and `dsh web` sessions omit DeepSeek Harness from Host-owned prompt sections after a Host restart. Existing session logs keep prior system-prompt events. The hidden Cordis preset persona can still mention DeepSeek Harness if that preset is mounted.
