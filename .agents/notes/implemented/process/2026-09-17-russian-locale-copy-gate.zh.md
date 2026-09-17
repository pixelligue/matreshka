# Agent Note: Russian locale copy gate

Status: implemented

[English](2026-09-17-russian-locale-copy-gate.md) | 中文

## Problem

Client 插件已经在 `zh`/`en` 旁注册 `ru` 词典，GUI 也可以默认俄语，但只核对 key 无法证明这些值是俄语。`Workspaces` 或 `Into the Unknown` 这类英文克隆仍会解析，因此俄语操作系统上的会话会出现中英混排。

## Decision

`scripts/locale-dictionary-parity.spec.ts` 要求每一对 `zh`/`en` 都提供 key 相同的 `ru` 对应词典。插值占位符名称必须与英文一致。仅当字符串属于语言中立时，才允许 `ru` 值等于英文对应项：显式 token 允许列表（工具名、单位、协议标签、品牌中立产品 token、没有 locale 席位的 Host presenter 回退）、`http(s)` URL，或在 `{placeholders}` 之外没有拉丁字母的字符串。

Desktop Electron 文案不在该 Client 扫描范围内；`apps/desktop/src/locale.ts` 提供 `ru`，且 `resolveDesktopLocale` 将 `ru*` 操作系统 locale 映射到它。

这并不取代 [locale-owned client UI copy](../architecture/2026-08-23-locale-owned-client-ui-copy.zh.md)：那篇笔记仍然规定产品文案必须进入类型化词典。这篇笔记规定俄语词典不得克隆英文产品文案。

## Alternatives considered

- **要求每个 `ru` 值都含西里尔字母。** 否决：单位、品牌名、URL 和仅含 `{placeholder}` 的字符串没有西里尔字母，按字母类别检查会误伤。
- **构建时从中文生成俄语。** 否决：产品文案必须是撰写的俄语，而不是另一个 locale 的机器拷贝。

## Consequences

新的英文产品文案克隆会让 CI 失败，而不是带着混排界面发版。维护者只有在字符串确实语言中立时才把 token 加入允许列表。日期格式可以重排 `{placeholder}` 名称；检查比较的是名称集合，而不是出现顺序。
