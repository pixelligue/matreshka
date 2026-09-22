# Agent Note: Matreshka 系统提示词身份

Status: implemented

[English](2026-09-20-matreshka-system-prompt-identity.md) | 中文

## 问题

Matreshka 界面文案已经使用 Matreshka，但每个 Host 会话仍以 `You are an AI agent powered by DeepSeek Harness.` 开头。该行在聊天中隐藏，模型仍可能在回复中自称 DeepSeek Harness。Web-app 的源码路径和 GUI 定向段落使用同一产品名。

## 决定

Matreshka 的 web-app 组合拥有身份。`system-prompt` 设置 `includeHarnessIdentity: false`，从而省略核心开场白；`personaPrefix` 仍为 `You are a coding agent powered by the {{model}} model.`。web-app 胶水插件自行注册带 Matreshka 措辞的 `harness:source` 和 `app:web-surface`，不再调用 `addHarnessSourceSection`；`DSH_WEB_URL` 的 bash 描述指向 Matreshka GUI。

核心包 `@deepseek-ai/dsh-system-prompt` 的默认开场白不变。CLI、headless、ACP 以及这些配置的录制快照仍使用上游身份。

## 考虑过的替代方案

- **修改核心身份字符串。** 未采用：所有非 Matreshka 配置及其快照会随产品覆盖层一起改动。
- **保留源码路径和 web-surface 原文。** 未采用：去掉开场白后，这些 Host 拥有的段落仍会写 DeepSeek Harness。

## 后果

重启 Host 后，新的 Matreshka Desktop 和 `dsh web` 会话在 Host 拥有的提示词段落中不再出现 DeepSeek Harness。已有会话日志保留先前的系统提示词事件。若挂载隐藏的 Cordis 预设，其 persona 仍可能提到 DeepSeek Harness。
