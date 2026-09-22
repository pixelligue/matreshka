## Purpose

Returns playable audio bytes only when the addressed session log references that file.

## ADDED Requirements

### Requirement: Session audio read

`session/audio` MUST return the durable file reference, an audio media type, and canonical base64 when the session log references that attachment, the stored name ends in mp3, wav, ogg, oga, m4a, aac, or webm, and the file is at most 32 MiB. Any other id, name, or size MUST fail as `session/attachment-invalid` and MUST NOT be sent to the model as audio bytes.

#### Scenario: Referenced recording

- **WHEN** the session log references `note.mp3` within 32 MiB
- **THEN** `session/audio` returns that file's bytes and `audio/mpeg`

#### Scenario: Unreferenced id

- **WHEN** the attachment id is absent from the session log
- **THEN** the read fails as `session/attachment-invalid`

#### Scenario: Not audio or too large

- **WHEN** the referenced file is `notes.txt` or larger than 32 MiB
- **THEN** the read fails as `session/attachment-invalid` without returning bytes

### Requirement: Transcription tool

The Host MUST register `transcribe_audio`. It reads a saved mp3, wav, ogg, oga, m4a, aac, or webm path through the session filesystem, refuses files above 25 MiB, and posts the bytes to `POST /v1/audio/transcriptions`. That route MUST call OpenRouter `deepgram/nova-3` with the server OpenRouter key and return the transcript text to the model.

#### Scenario: Transcribe a saved recording

- **WHEN** Matrena calls `transcribe_audio` with the saved path of a recording within 25 MiB
- **THEN** the tool result is the transcript text and the OpenRouter key stays on the API
