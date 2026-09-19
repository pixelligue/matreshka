# Agent Note: Matreshka CIS plugins catalog

Status: implemented

[English](2026-09-18-matreshka-cis-plugins.md) | 中文

## Problem

独联体运营商需要 ChatGPT 式的插件目录，覆盖 amoCRM、Bitrix24、Tilda 和酒店搜索。Harness 插件管理器、设置页和内部 Word/Excel/PDF 技能都不是正确的界面：前两者暴露 Cordis 组合，而文档必须留在内部，不能变成目录卡片。提供方令牌不得放在 Desktop 或会话日志里。

## Decision

Matreshka 交付三块协同部分：侧边栏「插件」标签、FastAPI 保存的连接，以及按启用来门控的 Host 技能/工具。

- **标签页。** `@deepseek-ai/dsh-client-ui-plugins-matreshka` 在 `sidebar.panellist` 注册 id `plugins`、order 10（位于「新会话」之下、「工作区」之上），以及 keyed `main` 占用者 `plugins`。选中后隐藏聊天；新会话和工作区会话选择已经调用 `layout.selectPanel(null)` 并恢复聊天。文案由 locale 拥有（RU/EN/ZH）。
- **目录。** 面板恰好列出 amoCRM、Bitrix24、Tilda 和 Amadeus。卡片使用这些服务的品牌标志。没有关于独联体的副标题。Word、Excel 和 PDF 被省略。启用与连接用会话 bearer POST 到 `/v1/plugins/{id}/enable` 和 `/connect`。Amadeus（`hotels`）使用产品 API 密钥，而不是按用户连接表单。
- **后端。** `PluginConnection` 按用户存储 `enabled` 和 JSON 密钥。`POST /v1/plugins/{id}/call` 代理允许清单内的 amoCRM REST v4、Bitrix 入站 webhook CRM 方法，以及 Tilda 导出 GET。未认证写入返回 401。缺少连接或插件已禁用返回 409。上游错误返回 502，且从不回显密钥。酒店连接返回 400。
- **Host。** `@deepseek-ai/dsh-cis-plugins-matreshka` 从 `GET /v1/plugins` 列出技能（`complete: false`，因此禁用会在下一次会话列举中可见）。工具 `amocrm`、`bitrix24`、`tilda` 和 `hotels` 调用 `/call`。Amadeus 酒店列表和报价使用 FastAPI 上的 `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET`。没有预订工具。

## Alternatives considered

- **把 Word/Excel/PDF 做成目录插件。** 否决：运营商要求文档留在内部技能，而不是公开卡片。
- **把令牌存在 Desktop 或会话日志。** 否决：与 OpenRouter 同一规则 — 提供方密钥留在 FastAPI，会话 bearer 是客户端唯一凭证。
- **通过 Yandex Travel、Bronevik 或 Ostrovok 做酒店预订。** v1 否决：那些 API 需要合作合同。v1 只搜索、摘要，然后外链。
- **v1 就做 amoCRM OAuth 多账户。** 延后：私人账户可以用长期令牌加子域；OAuth 要等合作应用 id。
- **把独联体工具放到 agent-preset 平面。** 否决：启用是按已登录用户，而技能注册表的全局层才是部署提供方所在的 host 平面。

## Consequences

- 运营商可从侧边栏启用独联体集成，不必打开设置或 Cordis 插件管理器。
- Matrena 在下一会话中看不到已禁用插件的技能；已连接但禁用或未连接的工具调用以 409 封闭失败。
- Desktop 从不持有 amo、Bitrix 或 Tilda 密钥。泄露的会话日志无法重放这些凭证。
- v1 中酒店搜索不能创建付费预订。
