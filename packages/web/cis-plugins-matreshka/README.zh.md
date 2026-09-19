---
description: "通过 Matreshka API 提供的 Host 独联体插件技能，以及代理的 amoCRM、Bitrix24 与 Tilda 工具。"
kind: "package-reference"
---

# @deepseek-ai/dsh-cis-plugins-matreshka

[English](README.md) | 中文

## 概述

有了 `dsh-cis-plugins-matreshka`，Matrena 会看到已登录用户启用的每个目录插件对应的技能。amoCRM、Bitrix24 和 Tilda 工具用会话 bearer POST 到 `{apiOrigin}/v1/plugins/{id}/call`。Amadeus 酒店是技能和 `hotels` 工具，POST 到 `/v1/plugins/hotels/call`。Word、Excel 和 PDF 仍是内部技能，不属于本目录。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [已知限制与延后工作](#known-limitations-and-deferred-work)
- [开发笔记](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

与聊天所用的 Matreshka API origin 一起挂载。技能在每次目录列举时刷新，因此禁用会在下一会话中可见。

```yaml
- id: cis-plugins-matreshka
  name: '@deepseek-ai/dsh-cis-plugins-matreshka'
  config:
    apiOrigin: http://127.0.0.1:8016
```

<a id="understand-the-implementation"></a>
## 理解实现

`listEnabledPlugins` GET `/v1/plugins`，并保留 `enabled` 为 true 的 id。技能提供方报告 `complete: false`，因此注册表不会缓存过期的启用集合。`amocrm`、`bitrix24` 和 `tilda` 工具调用 `/v1/plugins/{id}/call`。HTTP 409 变成封闭失败，并告诉模型请用户在「插件」中连接。空会话令牌不列出技能，也不会发请求。

### 工具接口

#### Token 影响

工具结果作为普通工具输出进入会话。已启用的技能正文进入技能目录。

#### KV Cache 影响

无直接失效。

## 已知限制与延后工作

<a id="known-limitations-and-deferred-work"></a>

- **密钥只在 API 上** — Host 从不持有 amo、Bitrix 或 Tilda 凭证。
- **Amadeus 不能预订** — 只有列表和报价；v1 没有预订工具。
- **文档不是插件** — Word、Excel 和 PDF 仍是内部技能。

<a id="dev-note"></a>
### 开发笔记

<details>
<summary>维护者工作上下文 — 点击展开</summary>

产品启用记录在 [CIS 插件 Agent Note](../../../.agents/notes/implemented/feature/2026-09-18-matreshka-cis-plugins.zh.md)。

</details>
