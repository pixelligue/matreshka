# Matreshka API

[English](README.md) | 中文

桌面应用调用模型时使用的 FastAPI 服务。此目录是独立的 uv 项目，不属于 pnpm 工作区。

## 前提条件

- [uv](https://docs.astral.sh/uv/)
- Docker，用于运行 Postgres 16 和 Redis 7

## 本地运行

以下命令均在 `backend/` 中执行。

启动仅监听本机的数据库服务：

```bash
docker compose up -d
```

从仓库根目录执行时，对应文件为 `backend/compose.yaml`。

复制环境变量并安装 Python 依赖：

```bash
cp .env.example .env
uv sync
```

用 CLI 创建操作员用户，或通过 `POST /v1/auth/register` 注册。不传 `--password` 时可以交互输入密码，避免命令回显：

```bash
uv run matreshka-api create-user --email you@example.com
```

在主机上运行 API，并启用自动重载。将端口 8016 绑定到本机，以匹配桌面端默认地址：

```bash
uv run fastapi dev --port 8016 --host 127.0.0.1
```

在 Windows 上，进程安装 `WindowsSelectorEventLoopPolicy`，以便异步 psycopg 连接。进程从环境变量或 `.env` 读取 `DATABASE_URL`、`REDIS_URL`、`SESSION_TTL_SECONDS`、`LLM_UPSTREAM_BASE_URL`、可选的 `LLM_UPSTREAM_API_KEY`、`LLMTOKENAPI_API_KEY`，以及可选的 `UPDATE_ARTIFACT_ROOT`、`OPENROUTER_API_KEY`、`MATRESHKA_APTABASE_USAGE_APP_KEY` 和 `MATRESHKA_APTABASE_HOST`。缺少必填变量时，进程以非零状态退出并指出变量名。`SESSION_TTL_SECONDS` 必须是正整数。不要提交 API 或 Aptabase 密钥。聊天补全通过 Gonka（`POST {LLM_UPSTREAM_BASE_URL}/chat/completions`）代理，使用 `LLM_UPSTREAM_API_KEY`。对外 id `matrena` 先尝试 `zai-org/GLM-5.3-Flash`，除非第一次响应是 HTTP 401 或 403，否则再试 `deepseek-ai/DeepSeek-V4-Flash-0731`。若 Gonka 仍失败且设置了 `OPENROUTER_API_KEY`，同一请求再试 OpenRouter `z-ai/glm-5.3-flash`。两个密钥都为空时返回 503。`UPDATE_ARTIFACT_ROOT` 可以为空；进程仍会启动，此时 `GET /v1/updates/desktop/{target}/{name}` 返回 404。`OPENROUTER_API_KEY` 可以为空；进程仍会启动，此时 consult/select 返回 503。

未认证的就绪检查：Postgres 和 Redis 均可响应时，`GET /health` 返回 200，否则返回 503。数据服务不可用也不会阻止 HTTP 进程启动。

已认证的 Web 搜索：`POST /v1/web/search` 接受 `{ "query": "...", "provider": "keenable" | "llmtokenapi" }`。默认的 `keenable` 调用 Keenable 公共搜索接口（`X-Keenable-Title: Matreshka`）。`llmtokenapi` 使用 `LLMTOKENAPI_API_KEY` 调用 LLMTOKENAPI `POST /v1/search`。响应中不会出现密钥。

已认证的咨询：`POST /v1/consult` 接受 `{ "goal", "question", "plan"?, "evidence"? }`（UTF-8 上限 32,000 字节），调用 OpenRouter `deepseek/deepseek-v4.1-flash`，返回 `{ "verdict": "ok"|"revise"|"risk", "detail" }`。已认证的工具选择：`POST /v1/tools/select` 接受 `{ "goal", "candidates" }`（UTF-8 上限 16,000 字节），调用 OpenRouter Decisions `typesafe/jev-1.13`，返回 `{ "tool", "confidence" }`。已认证的技能选择：`GET /v1/skills` 列出保存在 API 上的已发布技术栈技能，`POST /v1/skills/plan` 接受 `{ "request", "files"? }`，由 Jev 选择 `none` 或其中一项并返回其 `SKILL.md`。Host 会安装该文件供之后的回合使用，且不显示顾问工具。响应中不会出现 OpenRouter 密钥。

## 用量记录

API 在现有数据库中创建 `usage_events`，并记录经过聊天、咨询、工具选择或 API Web 搜索路由的每次已认证上游尝试。每条记录包含用户、操作、服务商、公开模型 ID、状态、服务商报告的 token 数量、请求和结果字节数，以及可用时的服务商不透明请求 ID。不保存提示词、补全内容、搜索词或搜索结果文本。标题生成使用同一聊天补全路由，因此也包含在聊天记录中；API 目前不会单独标识其用途。

`GET /v1/usage/events?limit=100` 返回当前登录用户最近的记录（limit 为 1–500）。`GET /v1/usage/summary` 按操作、服务商、模型、状态、货币和金额来源汇总该用户的记录。`amount_nanos` 以 RUB 或 USD 的十亿分之一为单位；`reported` 表示上游响应提供了费用，`rate_estimate` 表示 API 按内置 OpenRouter 标价估算，null 表示金额未知。汇总将这些类别分开，并统计报告了输入 token 的记录。上游失败或缺少用量时，金额记为未知，不会记为零费用。

只有 LLMTOKENAPI 聊天流或搜索响应包含 `usage.charged_kopecks` 时，账本才会记录其费用；OpenRouter 只有包含 `usage.cost` 时才提供实际费用。Keenable 公共接口不提供费用。桌面端默认的 Keenable 搜索和抓取提供方直接调用 Keenable，因此这些请求可见于 Harness 会话日志，但不会进入 `usage_events`。现有会话不会回填。若上游请求开始后数据库不可用，API 会记录记账错误并保留上游响应。

在 `http://127.0.0.1:8016/analytics/costs` 打开操作员费用报告。使用 Matreshka API 账户登录；Bearer 令牌仅保存在页面内存中，报告 API 仍要求认证。页面按日期、操作、服务商、货币及金额来源汇总最近 7、30、90 或 365 天。不会把 RUB 与 USD 或估算与已报告费用相加。`GET /v1/usage/report?days=30` 向当前登录用户提供相同的每日 JSON 汇总。

若要在自托管 Aptabase 中查看请求数量和类别，请创建单独的 Aptabase 应用，设置 `MATRESHKA_APTABASE_USAGE_APP_KEY=A-SH-...`；若不是默认本机 8000 端口，再设置 `MATRESHKA_APTABASE_HOST`。用量记录提交后，API 发送匿名 `upstream_usage` 事件，包含操作、服务商、模型、状态、token 数量及已知费用。不发送用户 ID、邮箱、提示词、搜索结果或服务商请求 ID。投递采用尽力而为；数据库报告是精确总额的来源。Aptabase 内置图表统计事件数量，不会对费用字段求和。

桌面端自动更新文件公开提供。允许的目标为 `win-x64`、`mac-arm64` 和 `mac-x64`。频道元数据为 `latest.yml`（Windows）或 `latest-mac.yml`（macOS）。将打包后的目标复制到工件根目录：

```bash
uv run matreshka-api publish-desktop --target win-x64 --from /path/to/electron-builder/output
```

## 测试

在 `backend/` 中运行：

```bash
uv run pytest
```
