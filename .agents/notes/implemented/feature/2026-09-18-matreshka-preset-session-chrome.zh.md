# Agent Note: Hide Matreshka agent-preset session chrome

Status: implemented

[English](2026-09-18-matreshka-preset-session-chrome.md) | 中文

## 问题

每个 Matreshka 会话都跑完整的 Standard 代理。会话标题仍写着「标准模式」，而 unpackaged Desktop 仍显示 Windows 的 Application 菜单，因为 `start:desktop --skip-build` 启动的是编译后的 `lib/main.js`，不是 `src/main.ts`。

## 决策

`ui-agent-preset` 的 Config 增加 `sessionChrome`（默认 false），因为浏览器插件收不到 YAML config。因此不注册标题中的 preset 名和新建会话 chip。seat 仍把部署默认值（`standard`）应用到新会话。

Windows 菜单隐藏会编译进 `apps/desktop/lib/main.js`。`main.ts` 的菜单改动之后，unpackaged Desktop 必须重建该产物。每个窗口还会执行 `setMenu(null)` / `removeMenu()` / `setMenuBarVisibility(false)`，并且 `browser-window-created` 会再做一遍。

## 考虑过的替代方案

- **整插件禁用 `ui-agent-preset`。** 已拒绝：新会话不会通过 seat 应用 Standard 默认值。
- **用 CSS 藏标题标签。** 已拒绝：slot 仍占标题空间，并留在无障碍树中。

## 后果

- 运营方不能从 GUI 选择 PTC、Minimal 或 Creator。要改回去需要 `sessionChrome: true` 以及 Agent presets 设置分区。
- 编辑 `main.ts` 后执行 `pnpm run start:desktop` 不会带上菜单改动，直到 `pnpm --filter @deepseek-ai/dsh-desktop run build`。
