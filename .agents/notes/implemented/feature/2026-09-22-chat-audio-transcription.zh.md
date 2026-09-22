# Agent Note: Chat audio transcription

Status: implemented

[English](2026-09-22-chat-audio-transcription.md) | 中文

## Problem

聊天可以播放附加的录音，但 Matrena 只收到文件路径，而读取工具只接受 UTF-8 文本。她无法说出录音的内容。

## Decision

`transcribe_audio` 通过会话文件系统读取保存路径，并把字节发到 `POST /v1/audio/transcriptions`。API 用 `OPENROUTER_API_KEY` 调用 OpenRouter `deepgram/nova-3`。工具结果是转写文本。超过 25 MiB 的文件被拒绝。语言可选，否则由提供方检测。

OpenRouter 上的 Deepgram Nova-3 约为每分钟 $0.0043。那里免费的 Deepgram 模型是 Flux 文本转语音，不是转写。Nova-3 才是语音转文字模型。

## Alternatives considered

**在桌面放一把直连 Deepgram 的密钥。** 产品已经把 OpenRouter 留在 API 上。桌面上的第二把供应商密钥被拒绝。

**默认用 Whisper。** 它也在同一端点上。操作者要的是 Deepgram。Nova-3 是便宜的 Deepgram 转写模型，不是免费的语音合成模型。

## Consequences

Matrena 要在新的桌面会话里才能看到 `transcribe_audio`。OpenRouter 密钥不会离开 API。数据库可用时，用量记为操作 `transcribe`。本地能播放但超过 25 MiB 的录音仍然不能转写。

## Testing

`backend/tests/test_transcription.py` 覆盖鉴权、缺失密钥、Nova-3 请求字段、大小上限和密钥脱敏。`transcribeFormat` 覆盖可播放扩展名。
