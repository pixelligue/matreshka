# Agent Note: Chat audio transcription

Status: implemented

English | [中文](2026-09-22-chat-audio-transcription.zh.md)

## Problem

The chat can play an attached recording, but Matrena only receives a file path and the read tool accepts UTF-8 text. She cannot say what the recording contains.

## Decision

`transcribe_audio` reads the saved path through the session filesystem and posts the bytes to `POST /v1/audio/transcriptions`. The API calls OpenRouter `deepgram/nova-3` with `OPENROUTER_API_KEY`. The tool result is the transcript text. Files above 25 MiB are refused. Language is optional and otherwise detected by the provider.

Deepgram Nova-3 on OpenRouter is about $0.0043 per minute. The free Deepgram model there is Flux text-to-speech, not transcription. Nova-3 is the speech-to-text model.

## Alternatives considered

**A direct Deepgram key on the desktop.** The product already keeps OpenRouter on the API. A second vendor key on the desktop was rejected.

**Whisper as the default.** It is also on the same endpoint. The operator asked for Deepgram. Nova-3 is the cheap Deepgram transcription model, not the free speech model.

## Consequences

A new Desktop session is required before Matrena sees `transcribe_audio`. The OpenRouter key never leaves the API. Usage is recorded as operation `transcribe` when the database is up. Recordings that play locally above 25 MiB still cannot be transcribed.

## Testing

`backend/tests/test_transcription.py` covers auth, a missing key, Nova-3 request fields, the size cap, and key redaction. `transcribeFormat` covers the playable extensions.
