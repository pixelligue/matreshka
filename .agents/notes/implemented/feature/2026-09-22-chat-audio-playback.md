# Agent Note: Chat audio playback

Status: implemented

English | [中文](2026-09-22-chat-audio-playback.zh.md)

## Problem

Operators can attach a recording, but the composer and the sent message only show a file card. Matrena is a text-only route, so she cannot hear those bytes, and the composer does not say which attachments she can read.

## Decision

The chat plays mp3, wav, ogg, oga, m4a, aac, and webm. A draft uses a local object URL. Sending keeps that URL, keyed by the uploaded attachment id, so the sent message plays in the same browser session. After reload, `session/audio` returns canonical base64 when the session log references the file and it is at most 32 MiB. Other names, missing ids, and larger files fail as `session/attachment-invalid` before or without returning bytes.

The composer shows one locale-owned line: Matrena reads UTF-8 text and source files, and those audio extensions can be played in the message. The model still receives only the saved path.

## Alternatives considered

**Speech-to-text on the API.** Playback shipped first. Transcription later shipped as `transcribe_audio` through OpenRouter Deepgram Nova-3; see [chat audio transcription](2026-09-22-chat-audio-transcription.md).

**`/api/file` for attachment bytes.** That route serves a filesystem path. Attachment events do not carry a host path, and the desktop page is `dsh-app://`, where a relative file URL does not load. The image read Remote is the transport that already works there.

**A player inside the 64px draft rail.** Native audio controls do not fit. Playable drafts are a full-width row above the rail. Sent messages keep the file card and add the control under the name.

## Consequences

Files larger than 32 MiB play until the page reloads, then the card reports that playback failed. A stored name without a playable extension is not recognized after reload even if the browser media type was audio. Video, PDF, and Office files stay name-and-size cards. Matrena still cannot decode them.

## Testing

`session-audio.host.spec.ts` covers the extension set, a referenced mp3, a text file, a missing id, and the 32 MiB refusal. Composer and message tests cover the draft player and a sent mp3 beside a text card.
