# Design

## Context

See proposal.md. Generic files are stored verbatim. `session/attachment` returns images only. `FileAttachmentRef` has a name and a byte length, not a media type. The composer rail is 64px tall, so a native audio control does not fit inside a file card there. Matrena's route is text-only.

**Ownership:** Host `session-controller`; Client `ui-primitives`, `ui-conversation`, `ui-attachment`, `ui-chat`.

## Goals / Non-Goals

**Goals:** Hear attached audio in the draft and in a sent message, including after reload when the file is within 32 MiB. Show what Matrena can read.

**Non-Goals:** Transcription, document extraction, video, and sending audio bytes to the model.

## Decisions

### 1. `session/audio` mirrors image authorization

The method scans the session log for a file block with that attachment id, accepts only the playable extensions, refuses files larger than 32 MiB before reading, and returns canonical base64. The client builds a blob URL. A file that is not in the log is `session/attachment-invalid`.

### 2. The current browser session does not wait for that read

On send, the client keeps an object URL for the picked `File`, keyed by the uploaded attachment id. The echo and the later durable row play that URL. Reload misses the cache and calls `session/audio`.

### 3. Players sit outside the 64px rail

Draft audio is a full-width row above the other attachment cards. A sent audio file keeps the file card and adds a native `<audio controls>` element. Other files stay unchanged.

### 4. The hint is locale-owned composer copy

It states that Matrena reads UTF-8 text and source, and lists the playable audio extensions. It does not claim she can hear the audio.

## Risks / Trade-offs

- Files above 32 MiB play from the local object URL until reload, then the card shows a load failure.
- A playable file whose stored name has no extension cannot be recognized after reload.
- Base64 over the existing Remote is the same transport images already use. A streaming media route would not work on the desktop `dsh-app://` page.
