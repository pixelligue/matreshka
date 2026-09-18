# Agent Note: Matreshka startup mark and hidden harness chrome

Status: implemented

[English](2026-09-18-matreshka-startup-chrome.md) | 中文

## 问题

Desktop 启动时用的是通用 CSS 转圈，Windows 的 Application 菜单列出 Plugins、Check for Updates 和 Exit，会话界面仍提供 Trajectory 和 Download session log。这些是 harness 运营面，不是 Matreshka 产品界面。

## 决策

外壳启动页（`dsh-app://shell/startup.html`）用 `apps/desktop/renderer/matreshka-logo.png` 作为加载标志，并以空会话英雄区同一套不倒翁晃动来表现加载。减少动效时标志保持静止。启动失败会隐藏标志并保留恢复操作。该 PNG 是 `apps/web/public/matreshka-logo.png` 的副本；`serveShellAsset` 以 `image/png` 提供 `.png`。

Windows 与 Linux 调用 `Menu.setApplicationMenu(null)`，并且每个窗口执行 `setMenu(null)`、`removeMenu()` 和 `setMenuBarVisibility(false)`，这样 Application 栏不会留下。macOS 只注册 `{ role: 'appMenu' }`。打包后的更新检查仍在主窗口就绪十秒后通过 `checkAndPrompt(false)` 运行。没有 Plugins 窗口，也没有手动 Check for Updates 菜单项。

Desktop overlay `apps/desktop-host/config/desktop.cordis.patch.yml` 将 `ui-trajectory` 和 `session-log-download` 设为 `disabled: true`。8080 端口上的 web profile 不变。这些包仍留在仓库中。

## 考虑过的替代方案

- **保留转圈，只改样式。** 已拒绝：产品标志已经是英雄区的加载语言。
- **保留 Windows Application 菜单，用 `visible: false` 藏菜单项。** 已拒绝：空的或仍叫 Application 的菜单栏仍是运营方要求去掉的界面。
- **从 web-app patch 删除 `ui-trajectory` 和 `session-log-download`。** 已拒绝：那会改 web profile；Desktop 用 overlay 禁用这两行。

## 后果

- 运营方不能从菜单打开插件管理窗口；启动失败时恢复操作仍提供禁用插件和重置。
- Trajectory 和 Download session log 在 `dsh web` 和作为包时仍然存在；只有 Desktop 隐藏它们。
- 更换套娃资源时需要同时更新 web public 文件和 renderer 副本。
