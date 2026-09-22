# Agent Note: Matreshka 网站注册与 Desktop 交接

Status: implemented

[English](2026-09-20-matreshka-web-auth.md) | 中文

## 问题

操作员无法自己创建账号。Desktop 在应用内收集邮箱和密码，因此公开网站不能作为注册或登录的地方。

## 决定

落地页提供 `/login` 和 `/register`。这些页面调用 FastAPI 的 `POST /v1/auth/login` 和 `POST /v1/auth/register`。带 `?next=desktop` 时，成功会话会签发 `POST /v1/auth/desktop-code` 并跳转到 `matreshka://auth?code=`。Desktop 用该码换自己的 Bearer。CLI `create-user` 保留。打包后的 Desktop 只显示通过网站登录的控件。未打包 Desktop 和 web GUI 保留密码表单（可用 `MATRESHKA_LOCAL_LOGIN` 覆盖）。

协议 URL 携带 Redis 中 60 秒一次性码，而不是会话 Bearer。网站会话和 Desktop 会话彼此独立。

## 考虑过的替代方案

- **把 Bearer 放进 `matreshka://auth?token=`。** 未采用：浏览器历史和操作系统日志会留下可用的会话密钥。
- **所有环境都去掉应用内登录，包括未打包。** 未采用：本地开发仍需要邮箱密码，而不走协议往返。

## 后果

打包后的 Desktop 需要可访问的落地页源（`MATRESHKA_LANDING_ORIGIN`，默认 `http://127.0.0.1:3020`）。已有 CLI 用户仍可认证。此变更不含邮箱验证。
