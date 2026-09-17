# Agent Note: 将 Matreshka 后端树放在 Cordis 图之外

Status: implemented

[English](2026-09-16-matreshka-backend-tree.md) | 中文

## 问题

Matreshka 必须通过产品 HTTP 服务调用模型，而不能作为桌面本地 provider。把该服务放进 pnpm workspace、Cordis 插件图或 `python/` SDK，会继承 Node 引擎、DSH 包名以及上游合并噪声。桌面适配器已经解析 OpenAI Chat Completions SSE（`dsh-llm-deepseek` 的 `parseSse` 与 `dsh-llm-pi-ai` 的 `api: openai-completions`），再发明第二套线路协议会迫使后续改写适配器。

## 决策

产品 API 位于 `backend/`，是名为 `matreshka-api` 的 uv FastAPI 项目，不进入 `pnpm-workspace.yaml`。本地 Postgres 16 与 Redis 7 由 `backend/compose.yaml` 启动，且只发布在 `127.0.0.1`；Redis 需要密码。运营者用 `uv run matreshka-api create-user` 创建用户（默认口令提示），没有 HTTP 注册。登录发放不透明的 Redis bearer 会话。`POST /v1/chat/completions` 是带鉴权的夹具 SSE，字面 `data:` 帧并以 `[DONE]\n\n` 结束，经 Starlette `StreamingResponse` 返回。数据存储宕机时 `GET /health` 进程仍在并返回 503。Windows 上进程安装 `WindowsSelectorEventLoopPolicy`，以便 async psycopg 连接。启动时运行 schema `create_all`，失败不中止 HTTP 进程。

## 考虑过的替代方案

- **并列仓库 `matreshka-api`** — 对上游 git 历史更干净，但 OpenSpec apply 只能写本检出。
- **Hono/Elysia + Better Auth** — 贴合其他本地 skill，因产品选择 FastAPI 且用户由运营者用邮箱密码创建而放弃。
- **FastAPI `EventSourceResponse`** — 作为 `response_class` 会吞掉生成器里的 `HTTPException`，返回 `ServerSentEvent` 对象会撞上 Starlette `.encode`；预格式化的 `StreamingResponse` 字节能保持字面 `[DONE]`。
- **JWT 会话** — 撤销本来就需要 Redis；不透明令牌就是会话。
- **Postgres 宕机时让进程启动失败** — 会使 `/health` 不可达，违反 503 就绪要求。

## 后果

在后续变更把 `dsh-llm-pi-ai` 指向此源之前，桌面、`packages/llm` 与 credentials 仍走上游行为。测试针对 sqlite 与 fakeredis，不能证明真实的 Windows+Postgres 事件循环。Compose 密码是绑定 loopback 的开发密钥，不是生产加固。CLI `--password` 仍供脚本使用，一旦传入就会出现在进程列表中。
