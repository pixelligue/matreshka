# Design

## Context

See proposal.md. OpenRouter `POST /api/v1/images` returns `data[].b64_json`. Consult already posts to OpenRouter with the session bearer. Chat already renders `conversation.message.images` via `ImageGallery`. Attachments persist through `ctx.attachments.saveImage`.

**Ownership:** FastAPI images router; Host `images-matreshka`; Client gallery/lightbox in chat.

## Goals / Non-Goals

**Goals:** Generate, edit, same-style batch; Jev model pick; pictures in regular chat; download/copy/share.

**Non-Goals:** Video, user-picked model in Settings, Grok batches (`n` max 1).

## Decisions

### 1. Default `openai/gpt-image-2` at `quality: low`

Cheapest measured (~0.5 ₽). Jev may choose `qwen/qwen-image-3` or `x-ai/grok-imagine-image-2.0`. Grok is omitted from candidates when `n>1` or more than 3 references.

### 2. One generate endpoint for create and edit

Edit is generate plus `input_references`. Host `edit_image` reads attachment bytes and sends them as references.

### 3. Gallery switcher, not only 64px tiles

A batch shows one large frame plus prev/next. Lightbox adds download/copy/share. Pictures stay in the chat transcript.

## Risks / Trade-offs

- **[Risk] OpenRouter image latency.** → 300s HTTP read already configured.
- **[Risk] Clipboard/share unsupported.** → Copy falls back to download; share falls back to copy.
- **[Trade-off] No model picker.** → Jev + default GPT.

## Migration Plan

Restart API and Desktop. Rollback: disable the plugin and router.

## Open Questions

None.
