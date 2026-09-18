# Agent Note: Matreshka product name and leftover GUI copy

Status: implemented

[English](2026-09-18-matreshka-product-name-copy.md) | 中文

## 问题

侧边栏已经写着 Matreshka，但窗口、安装器显示名、英文和中文 Desktop 外壳对话框、设置里的欢迎说明、插件网页搜索简介，以及空会话英雄区仍然叫 DeepSeek Harness 或沿用它的标语。

## 决策

显示名是 Matreshka（`productName` 和 `DSH_CLIENT_TITLE`）。产物文件名仍是 `deepseek-harness-…`。Desktop 的 en/zh 启动、更新和插件窗口文案与现有俄文 Matreshka 文案对齐。欢迎正文是两段短 alpha 说明；`WELCOME_NOTICE_VERSION` 为 `2026-09-18.1`，已确认过的用户会再看到它。网页搜索描述写 Matreshka 网页搜索。英雄标题是 "What should we do?" / "Что сделаем?" / "我们做什么？"；徽章是 "Alpha" / "Альфа" / "阿尔法"。

## 考虑过的替代方案

- **把安装文件改名为 `matreshka-*.exe`。** 已拒绝：会弄坏现有更新 YAML 和运营目录。
- **英雄标题直接用品牌词 Matreshka。** 已拒绝：套娃标志已经承担品牌。

## 后果

- 打包后的 `.app` / `.exe` 显示名变成 Matreshka；原先断言 `DeepSeek Harness.app` 的测试改为 `Matreshka.app`。
- 本变更未改 PWA manifest、CLI、网站，以及会话系统提示里的 "powered by DeepSeek Harness"。
