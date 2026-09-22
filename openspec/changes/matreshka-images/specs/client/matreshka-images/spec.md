## Purpose

Lets the operator view generated batches in regular chat, and download, copy, or share them.

## ADDED Requirements

### Requirement: Generation skeleton

While `generate_image` or `edit_image` is running, chat MUST show a picture-sized pulsing skeleton for each requested image in the same seat the settled picture will occupy. Locale-owned copy is required. A batch of `n` MUST show `n` skeleton frames (capped at 10).

#### Scenario: Skeleton while generating

- **WHEN** `generate_image` is running with `n=3`
- **THEN** the row shows three skeleton frames and no pictures

#### Scenario: Skeleton while editing

- **WHEN** `edit_image` is running
- **THEN** the row shows one skeleton frame

### Requirement: Batch switcher in chat

When a message contains more than one image, the chat MUST show one large preview with previous/next controls and a position label. Locale-owned copy is required.

#### Scenario: Switch a batch in chat

- **WHEN** a tool result contains three images
- **THEN** the operator can move between them without leaving the message

### Requirement: Download, copy, share

The image preview MUST offer download, copy, and share actions using locale-owned labels. Share MAY fall back to copy when the browser cannot share files.

#### Scenario: Download from preview

- **WHEN** the operator activates download on a generated image
- **THEN** the browser starts a file download of that image
