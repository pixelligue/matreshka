# Agent Note: Matreshka full-page sign-in

Status: implemented

[English](2026-09-17-matreshka-full-page-sign-in.md) | 中文

## Problem

Matreshka 首次运行把登录做成浮在 agent 界面之上的引导对话框。操作者在尚无会话时就能看见产品界面，容易把它和 DeepSeek API Key 对话框弄混；已存储的会话仍会在一次凭据往返中画出该对话框。

## Decision

`settings.onboarding` 上的 Matreshka 登录步骤是铺满视口的 body portal。其后方看不到应用界面。仅在该页绘制期间将 `#root` 标为 inert。步骤在 `MATRESHKA_SESSION_TOKEN` 的 `credentials.describe` 完成前返回 null，因此已存储的会话不会闪现登录页。提交将 `{email,password}` POST 到 `{apiOrigin}/v1/auth/login`，并把返回的 token 存到该引用。没有跳过入口。

普通 web e2e 场景在 Host 启动后写入占位 `MATRESHKA_SESSION_TOKEN`，以免登录页挡住它们。首次运行场景传入 `matreshkaSessionPending`。Host 测试在已存储令牌时向 `{apiOrigin}/v1/chat/completions` 发送 `Authorization: Bearer`；没有令牌时不发出模型 HTTP 请求。

## Alternatives considered

**把 `OnboardingModal` / `Modal` 拉到 100%。** 原语卡片仍落在带 padding 的遮罩叠加层里，应用在视觉上仍然在场。独立页面承接铺满视口的约定，而不改欢迎声明。

**在 `settings.onboarding` 之外再做一条 Client 路由。** 协调器已经按序排列声明与阻塞的首次运行步骤，并让外壳 inert。第二条组合路径会重复这段生命周期。

## Consequences

欢迎声明仍是小模态框。DeepSeek API Key 引导仍留在本包源码中，但不在 Matreshka 组合里注册。GUI 测试不得调用真实登录源；Playwright 兑现 `POST /v1/auth/login`。
