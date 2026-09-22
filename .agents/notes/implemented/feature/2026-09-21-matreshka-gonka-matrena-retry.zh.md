# Agent Note: Matrena 在两家 Gonka 模型上重试

Status: implemented

[English](2026-09-21-matreshka-gonka-matrena-retry.md) | 中文

## 问题

聊天被代理到 LLMTOKENAPI 的一个目录 id。操作员需要一个对外模型 `matrena`，由 Gonka 提供，第一次失败时换第二个模型。

## 决定

`matrena` 的 `POST /v1/chat/completions` 用 `LLM_UPSTREAM_API_KEY` 调用 `{LLM_UPSTREAM_BASE_URL}/chat/completions`。先试 `zai-org/GLM-5.3-Flash`，除非第一次响应是 HTTP 401 或 403，否则再试 `deepseek-ai/DeepSeek-V4-Flash-0731`。若 Gonka 没有成功返回流，再用 `OPENROUTER_API_KEY` 试 OpenRouter `z-ai/glm-5.3-flash`。客户端 SSE 仍显示 `matrena`。两个密钥都为空返回 503。网页搜索仍走 LLMTOKENAPI。

## 考虑过的替代方案

- **在桌面选择器里露出两个 Gonka id。** 未采用：产品 id 仍是一个模型。
- **401 也重试。** 未采用：错误密钥对两个模型同样失败。

## 后果

第一个模型失败会在客户端看到 502 之前多一次上游调用。流已经开始后不再换模型，因为字节可能已经发出。
