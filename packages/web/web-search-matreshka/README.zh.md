---
description: "ctx.web 的 Keenable 公开搜索，以及经 Matreshka API 的 LLMTOKENAPI 搜索。"
kind: "package-reference"
---

# @deepseek-ai/dsh-web-search-matreshka

[English](README.md) | 中文

## 概述

有了 `dsh-web-search-matreshka`，harness 会注册两个 `ctx.web` 搜索后端：Keenable 无需密钥的公开搜索，以及经 Matreshka API 代理的 LLMTOKENAPI 搜索。它还注册 Keenable 公开 fetch。Matreshka 桌面与 web 使用本包，关闭 DeepSeek 搜索，并把 `searchProvider` / `fetchProvider` 默认设为 `keenable`。面向模型的工具位于 `dsh-tool-web`。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

在 `dsh-web` 旁挂载本插件。它注册 `keenable` 与 `llmtokenapi`。用 `searchProvider: keenable` 固定默认值。

```yaml
- name: '@deepseek-ai/dsh-web'
  config:
    searchProvider: keenable
    fetchProvider: http
- name: '@deepseek-ai/dsh-web-search-matreshka'
  config:
    apiOrigin: http://127.0.0.1:8016
```

| 字段 | 默认 | 含义 |
|---|---|---|
| `apiOrigin` | `http://127.0.0.1:8016` | LLMTOKENAPI 搜索所用的 Matreshka API origin |
| `keenableSearchUrl` | `https://api.keenable.ai/v1/search/public` | Keenable 公开搜索 URL |
| `keenableTitle` | `Matreshka` | 公开 Keenable 调用上的 `X-Keenable-Title` |

-----

<a id="understand-the-implementation"></a>
## 理解实现

Keenable 调用公开搜索端点，带 `X-Keenable-Title`，不发送 API 密钥。LLMTOKENAPI 搜索向 `{apiOrigin}/v1/web/search` 发送 `provider: llmtokenapi` 与 Matreshka 会话令牌。`LLMTOKENAPI_API_KEY` 留在 API 进程。重定向会被拒绝。不发布运行时 invariant 伴生包；本包在所属 seam 已执行的约定之外，不暴露独立事件序列或可变数据关系。

-----

<a id="further-exploration"></a>
## 进一步探索

- [dsh-web](../web/README.zh.md)
- [dsh-tool-web](../tool-web/README.zh.md)
- [Web 能力缝决策](../../../.agents/notes/implemented/architecture/2026-06-24-web-capability-seam.zh.md)

-----

<a id="model-experience"></a>
## 模型体验

### 请求上下文与条件

#### 模型所见

`web_search` 来源：来自 Keenable 或 LLMTOKENAPI 的 URL、标题、snippet 与可选发布日期。失败以 `Keenable search aborted`、`Keenable search request failed: <error>`、`Matreshka session is required for LLMTOKENAPI search` 或 `Matreshka search API error (HTTP <status>)` 出现在工具包装中。

#### Token 效果

条件性：来源列表进入工具结果；无额外系统提示。

#### KV Cache 效果

无直接失效；由具名消费者拥有任何请求前缀变化。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

这些限制说明何时不宜使用本提供方。它们是当前的包约束。

- **Keenable 只使用公开无密钥端点** — 带密钥的 Keenable 与 fetch 不在本包。
- **LLMTOKENAPI 搜索需要 Matreshka 会话令牌** — 没有令牌时提供方不可用，也不会调用 API。
- **默认组合钉死 `keenable`** — 选择 `llmtokenapi` 需要 `searchProvider: llmtokenapi` 或 `$DSH_WEB_SEARCH_PROVIDER`。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文 — 点击展开</summary>

本开发备注是维护者的工作上下文：未决问题与未定方向。它明确不具权威性 — 已交付行为、限制与理由写在上文各节与所链 Agent Notes。

#### 未来：Keenable fetch

页面抓取仍由 `web-fetch-http` 承担。Keenable fetch 提供方将是另一次注册。

</details>
