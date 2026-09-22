# Agent Note: Jev 咨询闸门

Status: implemented

[English](2026-09-20-matreshka-jev-consult-gate.md) | 中文

## 问题

Matrena 靠提示词决定是否调用 Flash advisor，因此问候语仍可能消耗 OpenRouter，而困难请求可能跳过 advisor。Jev 已经能在命名选项中选择，却只被用作 `select_tool`。

## 决定

在第 1 步的 `agent/pre-step`，Host 把用户文本 POST 到 `/v1/tools/select`，候选为 `consult` 和 `skip`。`consult` 再 POST `/v1/consult`，并追加已记录的插件通知 `[advisor <verdict>] …`。`skip` 什么都不做。出错时放行。同一回合的后续步骤不再重复闸门。回合中途的 `consult` 工具保留。

聊天代理不变，因此工具往返不会再次调用 Jev。OpenRouter 密钥仍只在 FastAPI。聊天补全仍使用 `matrena`。

## 考虑过的替代方案

- **在 `/v1/chat/completions` 里做闸门。** 未采用：每次工具往返都会调用 Jev。
- **去掉 `consult` 工具。** 未采用：Matrena 在后续困难步骤仍需要 Flash。

## 后果

存在会话令牌时，每个用户回合都会产生一次 Jev Decisions 调用。缺少 `OPENROUTER_API_KEY` 时 API 仍返回 503；Host 吞掉该错误并继续聊天。advisor 通知可能像其他插件通知一样出现在聊天中。
