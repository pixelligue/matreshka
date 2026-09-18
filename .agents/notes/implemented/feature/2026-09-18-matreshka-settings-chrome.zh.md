# Agent Note: Matreshka compact Settings sheet

Status: implemented

[English](2026-09-18-matreshka-settings-chrome.md) | 中文

## 问题

设置仍使用 DeepSeek 的双栏 800×800 外壳。Matreshka 已经隐藏 Models、Plugins、Agent presets 和 Archived sessions，因此 188px 导航栏只剩一个空标题列，回环 Desktop 仍提供「打开配置文件」。

## 决策

当只显示一个设置分区时，`SettingsRoot` 省略导航栏，把标题放在关闭按钮同一行，并使用按内容定高的紧凑面板（约 560px）。两个及以上可见分区仍用 800px 双栏。`ui-settings-general` 的 Config 增加 `documentAction`（默认 false）。web-app patch 同样设 `documentAction: false`。整客户端测试使用 Zod 默认值，而不是 YAML `config`。

## 考虑过的替代方案

- **在 Desktop overlay 里禁用某一行来隐藏打开文档。** 已拒绝：该操作在 `ui-settings-general` 内部注册，不是独立插件 id。
- **面板始终按内容定高。** 已拒绝：在多个分区间切换会在指针下改变尺寸；那种情况仍用 800px 框。

## 后果

- 运营方不能从对话框打开 Host 设置文件；磁盘上的文件不变。
- 重新显示 Models 或 Plugins 时会自动回到双栏外壳。
