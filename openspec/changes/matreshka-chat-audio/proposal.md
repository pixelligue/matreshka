# Proposal

## Why

Operators can attach almost any file, but the chat cannot play audio, and the composer does not say which attachments Matrena can actually read. Matrena is text-only: she reads UTF-8 text through the file tools and receives only a path for everything else.

## What Changes

- Playable audio in the composer draft and in sent user messages: mp3, wav, ogg, oga, m4a, aac, and webm. The same browser session plays the local file immediately. After reload, `session/audio` returns the bytes when the session log references the file and it is at most 32 MiB.
- One line under the composer names what Matrena reads (UTF-8 text and source) and which audio extensions the chat can play.
- Matrena does not receive a transcript. Other files stay name-and-size cards.

## Non-goals

- No PDF, Office, or video players. No change to image admission. The model receives the transcript, not the audio bytes.

## Capabilities

### New Capabilities

- `client/matreshka-chat-audio`: Composer hint, draft player, and sent-message player.
- `host/matreshka-chat-audio`: Session-authorized audio byte read.

## Impact

- **Upstream seam:** `session-controller` Remote `audio`; `ui-conversation` composer; `ui-attachment` draft row; `ui-chat` user file card.
