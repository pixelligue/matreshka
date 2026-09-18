# Agent Note: Flash consultant and Jev tool select

Status: implemented

[English](2026-09-18-matreshka-flash-consultant.md) | 中文

## 问题

Matrena 是唯一的聊天模型。困难的编码与分析步骤需要廉价的第二意见，但不能在选择器里再放一个模型，也不能把 OpenRouter 密钥放到桌面。

## 决策

API 提供 `POST /v1/consult`（OpenRouter `deepseek/deepseek-v4.1-flash`，32k UTF-8 上限）和 `POST /v1/tools/select`（OpenRouter Decisions `typesafe/jev-1.13`，16k UTF-8 上限）。`OPENROUTER_API_KEY` 在进程启动时可选；缺密钥返回 503。Host 包 `@deepseek-ai/dsh-consult-matreshka` 用会话 bearer 注册 `consult` 和 `select_tool`，模式与 web-search-matreshka 相同。聊天 `model` 仍是 `matrena`。

## 考虑过的替代方案

- **用 Muse Spark 1.3 Contributor 做顾问。** 已拒绝：Meta 会用提示词和补全训练，包括用户代码。
- **用 Jev 做顾问。** 已拒绝：Jev 不生成文本，只回答有类型的问题。它只用于选择工具。

## 后果

- 只有 Matrena 调用这些工具时才会 consult/select。琐碎回合仍只走 LLMTOKENAPI。
- 线上 consult 需要 `backend/.env` 里的 `OPENROUTER_API_KEY`。
