# Agent Note: Matreshka public landing

Status: implemented

[English](2026-09-18-matreshka-landing.md) | 中文

## Problem

Matreshka 已有桌面产品，但没有公开营销页。把这段故事放进 `apps/web` 或 VitePress 文档站，会把 GUI、文档和获客混在一起。

## Decision

私有 Next.js App Router 应用放在 `apps/landing`（`@deepseek-ai/dsh-landing`，端口 3020）。Tailwind CSS 按 Codex 的首页顺序排版：页头、英雄区、Matrena 分数横幅、真实 Desktop 窗口、交替功能块、三张卡片。`/matrena`（英语 `/en/matrena`）是编辑式评测页：已公布分数、对照表，以及不声称 Matrena 在每块板上领先的说明。分数写在 `src/benchmarks.ts`；没有公布的格子用连字符。没有「你每天使用的服务」标志条。文案面向普通操作者（告诉 Matrena 要做什么），俄语在 `/`，英语在 `/en`。产品图是未打包 Desktop 在真实 Matrena 回合后的截图。该应用不是 npm 发布成员。Windows 下载使用 `MATRESHKA_WINDOWS_DOWNLOAD_URL`，未设置时控件仍可见。

## Alternatives considered

**用 NestJS 做落地页服务器。** 否决：NestJS 是后端框架。操作者要的是前端落地页；Next.js 的 App Router 才匹配 Tailwind。

**放进 `website/` 或 `apps/web`。** 否决：VitePress 是文档；`apps/web` 是已登录 GUI。

**把应用作为 dsh npm 发布成员。** 否决：营销站不是运行时包。

## Consequences

`pnpm run dev:landing` 无需会话即可提供页面。画面是 Desktop 截图，不是生成的假界面。Desktop、FastAPI 和 GUI 不变。
