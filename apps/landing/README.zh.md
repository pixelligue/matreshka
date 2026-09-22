---
description: "公开的 Matreshka 营销站点：Next.js App Router 与 Tailwind CSS，与产品 GUI 分开提供。"
kind: "bundle"
---

# @deepseek-ai/dsh-landing

[English](README.md) | 中文

## 概述

`dsh-landing` 是公开的 Matreshka 营销页。它是带 Tailwind CSS 的 Next.js 应用。它不启动 Cordis、FastAPI 或 Electron GUI。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)

-----

<a id="use-this-package"></a>
## 使用本包

在仓库根目录：

```sh
pnpm run dev:landing
```

应用监听 `http://127.0.0.1:3020`。俄语是 `/`。英语是 `/en`。登录是 `/login`（`/en/login`）；注册是 `/register`（`/en/register`）。设置 `NEXT_PUBLIC_MATRESHKA_API_ORIGIN`（默认 `http://127.0.0.1:8016`）和 `MATRESHKA_WINDOWS_DOWNLOAD_URL`；未设置下载 URL 时控件仍可见，但不会跳转。

<a id="understand-the-implementation"></a>
## 理解实现

页面顺序跟随 Codex 营销布局：页头、居中英雄区、Matrena 分数横幅、真实 Desktop 截图、交替的功能块、三张卡片。没有信任标志条。`src/locales.ts` 中的文案面向普通操作者。`public/shots/` 中的图来自未打包 Desktop。除非访问者开启减少动态效果，套娃标志会轻微摆动。

首页横幅给出三项已公布的 Matrena 分数（SWE-bench Verified 79.0、Terminal-bench 2.1 91.4、τ2 Telecom 95.0），并链到 `/matrena`（英文为 `/en/matrena`）。该页是编辑式对照：一张表加说明。分数写在 `src/benchmarks.ts`。没有公布的格子用连字符。文案不声称 Matrena 在每块板上领先。没有编造的 MERA 总分。
