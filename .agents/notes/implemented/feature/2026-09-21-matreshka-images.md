# Agent Note: Matreshka image generate and edit

Status: implemented

English | [中文](2026-09-21-matreshka-images.zh.md)

## Problem

Operators needed pictures in chat: generate, edit, and same-style batches. OpenRouter keys must stay on FastAPI. Chat already rendered attachments but batches were only 64px tiles with no download, copy, or share.

## Decision

`POST /v1/images/generate` calls OpenRouter `/api/v1/images`. Jev chooses among `gpt-image-2` (default, `quality: low`), `qwen-image-3`, and `grok-imagine-image-2.0`. Host tools `generate_image` and `edit_image` persist rasters with `saveImage` and render image content blocks. Chat batches use a prev/next switcher. The lightbox offers download, copy, and share. Pictures stay in the regular chat transcript (no Images sidebar). A running `generate_image` / `edit_image` row shows picture-sized skeleton frames (`n` of them for a batch) in the same seat the settled pictures occupy; `tool.call.images` cannot be declared a second time, so the generate/edit row loads thumbs itself. Host loads `@deepseek-ai/dsh-images-matreshka` from `lib/index.js`; without that artifact the tools never register and Matrena claims it cannot draw. Unpackaged Desktop mirrors `.pnpm/node_modules`; a plugin that exists only as a nested pnpm symlink under `dsh-web-app` is invisible to `existsSync` through a Windows junction, so `prepareDevelopmentProject` hoists nested `@deepseek-ai` packages into the flattened graph.

## Alternatives considered

- **Grok as default.** Rejected: about 7× GPT Image 2 low, and `n` is 1.
- **A Settings model picker.** Rejected for v1; Jev picks per task.

## Consequences

Image calls use the existing 300s HTTP read timeout. Grok is omitted when `n>1` or more than three references. Share falls back to copy when the browser cannot share files.
