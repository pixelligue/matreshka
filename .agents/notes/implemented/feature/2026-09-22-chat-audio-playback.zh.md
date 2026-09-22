# Agent Note: Chat audio playback

Status: implemented

[English](2026-09-22-chat-audio-playback.md) | 中文

## Problem

操作者可以附加录音，但输入区和已发送消息只显示文件卡片。Matrena 是纯文本路由，听不到这些字节，输入区也不说明她能读取哪些附件。

## Decision

聊天播放 mp3、wav、ogg、oga、m4a、aac 和 webm。草稿使用本地 object URL。发送时按已上传附件 id 保留该 URL，因此同一次浏览器会话里的已发送消息可以播放。重新加载后，若会话日志引用该文件且不超过 32 MiB，`session/audio` 返回规范 base64。其他文件名、缺失的 id 和更大的文件以 `session/attachment-invalid` 失败，且不返回字节。

输入区显示一行由文案字典拥有的说明：Matrena 读取 UTF-8 文本和代码，这些音频扩展名可以在消息里播放。模型仍然只收到保存路径。

## Alternatives considered

**在 API 上做语音转文字。** 播放先交付。转写后来以 `transcribe_audio` 交付，经 OpenRouter 的 Deepgram Nova-3；见 [聊天音频转写](2026-09-22-chat-audio-transcription.zh.md)。

**用 `/api/file` 读取附件字节。** 该路由按文件系统路径提供文件。附件事件不携带宿主路径，桌面页面是 `dsh-app://`，相对文件 URL 无法加载。图片读取 Remote 才是那里已经可用的传输。

**把播放器放进 64px 草稿栏。** 原生音频控件放不下。可播放草稿是附件栏上方的通栏行。已发送消息保留文件卡片，并在文件名下方加上控件。

## Consequences

超过 32 MiB 的文件在页面重新加载前可以播放，之后卡片报告无法播放。即使浏览器媒体类型是音频，没有可播放扩展名的存储文件名在重新加载后也不会被识别。视频、PDF 和 Office 文件仍是名称与大小卡片。Matrena 仍然不能解码它们。

## Testing

`session-audio.host.spec.ts` 覆盖扩展名集合、被引用的 mp3、文本文件、缺失 id 和 32 MiB 拒绝。输入区与消息测试覆盖草稿播放器，以及已发送 mp3 旁边的文本卡片。
