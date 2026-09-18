---
description: "通过 Matreshka API 与会话令牌调用的 Host consult 与 tool-select 工具。"
kind: "package-reference"
---

# @deepseek-ai/dsh-consult-matreshka

[English](README.md) | 中文

## 概述

有了 `dsh-consult-matreshka`，Matrena 可以调用 `consult`（经产品 API 的 DeepSeek V4.1 Flash）和 `select_tool`（经产品 API 的 Jev）。Host 只发送会话 bearer。OpenRouter 密钥留在后端。聊天补全仍使用 `matrena`。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [已知限制与延后工作](#known-limitations-and-deferred-work)
- [开发笔记](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

与聊天所用的 Matreshka API origin 一起挂载。Consult 需要已登录会话。问候语不要调用这两个工具。

```yaml
- id: consult-matreshka
  name: '@deepseek-ai/dsh-consult-matreshka'
  config:
    apiOrigin: http://127.0.0.1:8016
```

<a id="understand-the-implementation"></a>
## 理解实现

`consult` 将 `{goal, question, plan?, evidence?}` POST 到 `{apiOrigin}/v1/consult`。`select_tool` 将 `{goal, candidates}` POST 到 `{apiOrigin}/v1/tools/select`。空会话令牌在本地失败，不会发请求。

### 工具接口

#### Token 影响

工具结果作为普通工具输出进入会话。

#### KV Cache 影响

无直接失效。

## 已知限制与延后工作

<a id="known-limitations-and-deferred-work"></a>

这些限制说明这些工具何时不合适。

- **OpenRouter 密钥只在 API 上** — Host 从不持有；缺少密钥时 API 返回 HTTP 503。
- **载荷上限由 API 强制** — 过大的 consult 或 select 正文返回 400。

<a id="dev-note"></a>
### 开发笔记

<details>
<summary>维护者工作上下文 — 点击展开</summary>

Muse Spark Contributor 不在范围内，因为 Meta 会用提示词训练。

</details>
