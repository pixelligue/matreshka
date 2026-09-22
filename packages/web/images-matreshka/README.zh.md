---
description: "Host image generate and edit tools that call the Matreshka API with the session token."
kind: "package-reference"
---

# @deepseek-ai/dsh-images-matreshka

[English](README.md) | 中文

## 摘要

有了 `dsh-images-matreshka`，Matrena 可以调用 `generate_image` 和 `edit_image`。Host 将会话 bearer POST 到 `{apiOrigin}/v1/images/generate`。OpenRouter 密钥留在后端。Jev 在 `gpt-image-2`（默认，quality low）、`qwen-image-3` 与 `grok-imagine-image-2.0` 中选择。返回的栅格存为附件并显示在聊天中。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [已知限制与延后工作](#known-limitations-and-deferred-work)
- [开发说明](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

与聊天所用的 Matreshka API origin 一起挂载。图片需要已登录会话，以及 API 上的 OpenRouter 密钥。

```yaml
- id: images-matreshka
  name: '@deepseek-ai/dsh-images-matreshka'
  config:
    apiOrigin: http://127.0.0.1:8016
```

<a id="understand-the-implementation"></a>
## 理解实现

`generate_image` POST `{prompt, n?}`。`edit_image` 读取先前附件并将其作为 `references` 发送。空会话令牌在本地失败。

<a id="known-limitations-and-deferred-work"></a>
## 已知限制与延后工作

Grok 每次调用只接受一张图。视频不在范围内。

<a id="dev-note"></a>
## 开发说明

<details>
<summary>维护者工作上下文 — 点击展开</summary>

无。

</details>
