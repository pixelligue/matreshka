# @deepseek-ai/dsh-audio-matreshka

[English](README.md) | 中文

宿主工具 `transcribe_audio`。它通过会话文件系统读取已保存的录音，并把字节发到 `POST /v1/audio/transcriptions`。API 调用 OpenRouter `deepgram/nova-3`。OpenRouter 密钥留在 API 上。超过 25 MiB 的录音会被拒绝。模型收到转写文本，不会收到音频字节。
