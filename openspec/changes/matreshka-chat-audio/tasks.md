## 1. Host read

- [x] 1.1 Add `session/audio` for a log-referenced playable file at most 32 MiB, and cover allow, refuse, and oversize cases

## 2. Chat

- [x] 2.1 Play mp3, wav, ogg, m4a, aac, and webm in the composer draft and in sent messages
- [x] 2.2 Show the locale-owned composer line for what Matrena reads and which audio can be played

## 3. Transcription

- [x] 3.1 `POST /v1/audio/transcriptions` calls OpenRouter `deepgram/nova-3` with the server key
- [x] 3.2 Host tool `transcribe_audio` reads the saved path and returns the transcript
