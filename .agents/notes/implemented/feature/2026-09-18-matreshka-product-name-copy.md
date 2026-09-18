# Agent Note: Matreshka product name and leftover GUI copy

Status: implemented

English | [中文](2026-09-18-matreshka-product-name-copy.zh.md)

## Problem

The sidebar already said Matreshka, but the window, installer display name, English and Chinese Desktop shell dialogs, the settings welcome notice, the plugins web-search blurb, and the empty-session hero still named DeepSeek Harness or used its tagline.

## Decision

Display name is Matreshka (`productName` and `DSH_CLIENT_TITLE`). Artifact file stems stay `deepseek-harness-…`. Desktop en/zh startup, update, and plugin-window strings match the existing Russian Matreshka copy. Welcome body is a short two-paragraph alpha notice; `WELCOME_NOTICE_VERSION` is `2026-09-18.1` so acknowledged users see it again. Web-search description names Matreshka web search. Hero headline is "What should we do?" / "Что сделаем?" / "我们做什么？"; badge is "Alpha" / "Альфа" / "阿尔法".

## Alternatives considered

- **Rename installer files to `matreshka-*.exe`.** Rejected: that would break existing update YAML and operator folders.
- **Hero headline equal to the brand word Matreshka.** Rejected: the nesting-doll mark already carries the brand.

## Consequences

- Packaged `.app` / `.exe` display names become Matreshka; tests that used `DeepSeek Harness.app` now expect `Matreshka.app`.
- PWA manifest, CLI, website, and session system-prompt "powered by DeepSeek Harness" were left unchanged in this change.
