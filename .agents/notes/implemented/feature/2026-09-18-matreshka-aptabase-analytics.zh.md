# Agent Note: Matreshka Desktop Aptabase analytics

Status: implemented

[English](2026-09-18-matreshka-aptabase-analytics.md) | 中文

## 问题

已打包与未打包的 Matreshka Desktop 都没有产品分析。运营看不到日活、操作系统、应用版本，也看不到登录、发送、设置、新会话、网页搜索和更新是否被使用。会话 OTel 上传是另一条路径，填不上这个缺口。

## 决策

Desktop 把白名单事件 POST 到自托管 Aptabase 的 `{host}/api/v0/event`，使用 `A-SH-` App Key。默认主机是 `http://127.0.0.1:8000`。Electron 主进程在 `apps/desktop/src/analytics.ts` 里用 Electron `net` 做摄入，不调用 `@aptabase/electron` 的 `initialize()`，因为该 SDK 会通过 `protocol.registerSchemesAsPrivileged` 注册 `aptabase-ipc`，而 Electron 只允许调用一次，Desktop 已经注册了 `dsh-app`。

每条事件都带 `systemProps`：操作系统名称与版本、locale、应用版本、Chromium 引擎、SDK 标识，以及 `isDebug`（`!app.isPackaged`）。未打包流量在仪表盘里是 Debug。白名单为 `app_started`、`update_check`、`update_install`、`ui_sign_in`、`ui_sign_out`、`ui_settings_open`、`ui_new_session`、`ui_send`、`ui_web_search`。未知名称以及像邮箱、令牌、路径或消息的值会被丢弃。应用文档通过 preload IPC 得到 `dshDesktop.analytics.track`；没有桥时 web profile 直接 no-op。运营 compose 在 `ops/aptabase/`。ClickHouse 大约每十秒刷新一次。

## 考虑过的替代方案

- **官方 `@aptabase/electron` 的 `initialize()`。** 它会再次注册特权 scheme，并在 `app.whenReady()` 之后调用时关闭跟踪。已拒绝。
- **渲染进程 HTTP 并内置 App Key。** 密钥和白名单会进 web 包。已拒绝。
- **FastAPI 摄入代理。** 多一跳源站且没有隐私收益；Aptabase 摄入本就靠 App Key 公开。已拒绝。
- **DOM 点击流。** Aptabase 没有自动捕获；点击日志会泄漏文案。具名 chrome 事件胜出。

## 后果

- 未设置 `MATRESHKA_APTABASE_APP_KEY` 时不跟踪。回滚即取消该变量。
- 本地核对必须打开 Debug 仪表盘开关，并等待十秒刷新。
- `ui_web_search` 在 `web_search` 工具行挂载时触发，而不是专用 composer 开关。
