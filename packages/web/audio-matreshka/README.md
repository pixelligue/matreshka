# @deepseek-ai/dsh-audio-matreshka

English | [中文](README.zh.md)

Host tool `transcribe_audio`. It reads a saved recording through the session filesystem and posts the bytes to `POST /v1/audio/transcriptions`. The API calls OpenRouter `deepgram/nova-3`. The OpenRouter key stays on the API. Recordings larger than 25 MiB are refused. The model receives the transcript text and does not receive the audio bytes.
