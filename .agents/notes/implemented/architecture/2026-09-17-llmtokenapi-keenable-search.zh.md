# Agent Note: LLMTOKENAPI chat and Keenable search

Status: implemented

[English](2026-09-17-llmtokenapi-keenable-search.md) | 中文

## 问题

Matreshka 聊天仍把 `matrena` 映射到 Gonka 厂商模型 id，并读取 `LLM_UPSTREAM_API_KEY`。LLMTOKENAPI 要求使用 `GET /v1/models` 的公开目录 id，且 `LLMTOKENAPI_API_KEY` 只能留在服务器。桌面 web 搜索仍挂载 DeepSeek 搜索，而这需要产品不再保存的 DeepSeek 密钥。

## 决策

**聊天补全代理 LLMTOKENAPI。** `matrena` 映射到目录 id `deepseek-ai-deepseek-v4-flash-0731`。进程要求 `LLMTOKENAPI_API_KEY` 与 `LLM_UPSTREAM_BASE_URL`（文档默认 `https://api.llmtokenapi.ru/v1`）。密钥从 502 响应体中脱敏，且不会作为日志字段。客户端发送的目录 id 或 Gonka 厂商 id 返回 400。

**Matreshka web/desktop 用两个搜索提供方替换 DeepSeek 搜索。** `@deepseek-ai/dsh-web-search-matreshka` 注册 `keenable`（Keenable `POST /v1/search/public`，`X-Keenable-Title: Matreshka`，无密钥）和 `llmtokenapi`（`POST {apiOrigin}/v1/web/search` 带 Matreshka 会话令牌）。API 为 LLMTOKENAPI 搜索持有 `LLMTOKENAPI_API_KEY`。默认 `searchProvider` 为 `keenable`。web-app overlay 禁用 `web-search-deepseek`。抓取仍为 HTTP。

## 考虑过的替代方案

**从 Host 用网关密钥调用 LLMTOKENAPI 搜索。** 否决，因为密钥不得离开 API 进程。

**把 Keenable 也经 API 代理。** 否决默认路径：公开端点没有秘密，不必多一跳。LLMTOKENAPI 搜索仍走 API。

**保留 DeepSeek 搜索作为回退。** 否决，因为它需要 `DEEPSEEK_API_KEY`，而 Matreshka 不保存该密钥。

## 后果

- 运营方将 `LLM_UPSTREAM_API_KEY` 改名为 `LLMTOKENAPI_API_KEY`。
- 默认 web 搜索受 Keenable 公开速率限制约束。
- 选择 LLMTOKENAPI 搜索需要已登录会话。
