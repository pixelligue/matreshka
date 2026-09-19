---
description: "侧边栏「插件」标签页与 amoCRM、Bitrix24、Tilda、Amadeus 酒店的目录面板。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-plugins-matreshka

[English](README.md) | 中文

## 概述

本包在 `sidebar.panellist` 上注册一条本地化的「插件」行（order 10，位于「新会话」之下），以及一个在打开时隐藏聊天的 keyed `main` 面板。目录列出 amoCRM、Bitrix24、Tilda 和 Amadeus。Word、Excel 和 PDF 不是卡片。启用与连接用会话 bearer 发到 Matreshka API；Desktop 从不保存提供方密钥。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [模型体验](#model-experience)
- [已知限制与延后工作](#known-limitations-and-deferred-work)
- [开发笔记](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

在 web-app 浏览器名册中挂在 `ui-sidebar` 之后。新会话和工作区会话会调用 `layout.selectPanel(null)` 并回到聊天。

```yaml
- id: ui-plugins-matreshka
  name: '@deepseek-ai/dsh-client-ui-plugins-matreshka'
```

-----

<a id="understand-the-implementation"></a>
## 理解实现

panellist id 与 main key 都是 `plugins`。状态来自 `GET /v1/plugins`。连接 POST 到 `/v1/plugins/{id}/connect`。Amadeus 酒店使用产品 API 密钥，而不是按用户连接表单。

## 模型体验

无。本包只提供浏览器呈现，没有任何内容进入模型请求。

#### KV Cache 影响

无；本包既不组装也不发送提供方请求。

## 已知限制与延后工作

<a id="known-limitations-and-deferred-work"></a>

- **浏览器插件收不到 YAML `config`。** 目录使用 `http://127.0.0.1:8016` 作为 API origin。
- **Amadeus 酒店使用产品密钥。** 卡片可以启用；预订不在范围内。

<a id="dev-note"></a>
### 开发笔记

<details>
<summary>维护者工作上下文 — 点击展开</summary>

产品启用记录在 [CIS 插件 Agent Note](../../../.agents/notes/implemented/feature/2026-09-18-matreshka-cis-plugins.zh.md)。

</details>
