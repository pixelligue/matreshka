# Matreshka Desktop 本地 Aptabase

[English](README.md) | 中文

自托管 Aptabase 用于桌面端产品分析。未打包的桌面端流量显示在 **Debug** 中。服务器大约每 **十秒** 将事件写入 ClickHouse。

## 启动

```sh
docker compose -f ops/aptabase/docker-compose.yml up -d
```

打开 `http://127.0.0.1:8000`。没有默认账户。注册后，从以下日志中取得激活链接：

```sh
docker compose -f ops/aptabase/docker-compose.yml logs aptabase
```

创建一个应用，并复制其 `A-SH-` App Key。

## 将 Desktop 指向该实例

```sh
set MATRESHKA_APTABASE_APP_KEY=A-SH-your-key
set MATRESHKA_APTABASE_HOST=http://127.0.0.1:8000
pnpm run start:desktop
```

在 POSIX 环境中使用 `export` 代替 `set`。

## 确认事件

1. 登录、发送消息并打开设置。
2. 在仪表盘中切换到 **Debug**（虫子图标），而不是 Release。
3. 等待至少十秒。
4. Live View 显示 `app_started` 和 `ui_*` 事件。OS 和 Version 小组件使用 `systemProps`。

## 模型与工具用量

为服务端用量事件创建第二个 Aptabase 应用。在 `backend/.env` 中将 `MATRESHKA_APTABASE_USAGE_APP_KEY` 设为该应用的 `A-SH-` 密钥；`MATRESHKA_APTABASE_HOST` 使用此实例的地址，默认是 `http://127.0.0.1:8000`。重启 API。新 `upstream_usage` 事件会出现在该应用的 Live View，包含操作、服务商、模型、token 数量和已知费用，不含用户身份或请求文本。独立应用避免服务端事件影响 Desktop 会话指标。

Aptabase 显示事件数量和类别。若要查看准确的 RUB 和 USD 总额，请在 `http://127.0.0.1:8016/analytics/costs` 打开 API 的[操作员费用报告](../../backend/README.zh.md)，并使用 Matreshka API 账户登录。报告中的已确认费用、标价估算和未知费用保持分开。

`AUTH_SECRET` 必须至少为 32 字节（HS256）。绑定到非本机地址前，请修改 compose 中的密码和 `AUTH_SECRET`。
