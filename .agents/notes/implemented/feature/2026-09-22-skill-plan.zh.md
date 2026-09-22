# Agent Note: Internal skill plan before Matrena

Status: implemented

[English](2026-09-22-skill-plan.md) | 中文

## Problem

Matrena 开始产品或开发请求时，没有共享的对象、范围和现场演示路径。Jev 已经决定是否让 Flash 给一个简短裁决，Flash 也已经返回 ok、revise 或 risk。这两步都不持有技能，因此工作模型会在阅读仓库之前自己发明范围。

## Decision

API 保存已发布的 `SKILL.md`，覆盖 Matrena 会接到的技术栈：前端设计、MCP、FastAPI、Django、Next.js、Tailwind、NestJS、Expo、React Native、Postgres、MySQL 和 Bun。`GET /v1/skills` 列出它们。`POST /v1/skills/plan` 把用户请求交给 Jev，Jev 选择 `none` 或一项技能并返回该文件。OpenRouter 密钥留在 API 上。

在用户回合的第一步，只要 Jev 没有选 `skip`，Host 就请求该技能；会话知道 cwd 时写到项目 `.dsh/skills`，否则写到 `DSH_HOME/skills`，并作为 `skill-invocation` 指令注入。Jev 选择 `consult` 时顾问仍在后台运行，这两次调用都不是模型工具。不要求 Matrena 宣布顾问。失败不阻断聊天。聊天模型仍是 `matrena`。

## Alternatives considered

- **用桌面 SKILL.md 作为登记。** 拒绝：这些展示技能是 Matreshka 拥有的产品说明，不是操作者按项目编辑的文件。
- **用计划替换咨询裁决。** 拒绝：ok/revise/risk 仍判断有风险的请求。计划是额外通知。
- **让 Matrena 用工具去取计划。** 拒绝：Jev 在工作模型之前运行，因此计划在第一步就存在，而不等待工具调用。

## Consequences

- 产品或开发请求可以带着概念计划和明确的拒绝清单到达 Matrena。
- 写信或问候不付技能计划的费用。一个明确的非开发任务仍会问 Jev 适用哪项技能，通常得到 `none`。
- 文件笔记是可选的。笔记为空时，计划必须写先去找什么，而不是写出路径。
