# Proposal

## Why

Operators need Matrena to generate and edit pictures, including a same-style batch, without leaving chat. Keys stay on FastAPI. OpenRouter already bills the product.

## What Changes

- Authenticated `POST /v1/images/generate` calls OpenRouter `/api/v1/images`. Jev chooses among `gpt-image-2` (default, quality `low`), `qwen-image-3`, and `grok-imagine-image-2.0`. Edit uses `input_references`. Batch uses `n` (capped per model).
- Host tools `generate_image` and `edit_image` post with the session bearer, persist PNGs as attachments, and return image content blocks so they render in chat.
- Chat galleries with more than one image switch (prev/next). Lightbox can download, copy, and share. Pictures stay in the regular chat transcript. Video is out of scope.

## Non-goals

- No video. No per-user OpenRouter key. No in-app model picker.

## Capabilities

### New Capabilities

- `backend/images`: OpenRouter image generate/edit proxy with Jev model pick.
- `host/matreshka-images`: Host tools that persist generated images as attachments.
- `client/matreshka-images`: Chat batch switcher, download/copy/share in the regular transcript.

## Impact

- **Upstream seam:** FastAPI `images` router; `packages/web/images-matreshka`; `ui-attachment` gallery/lightbox; conversation locale.
