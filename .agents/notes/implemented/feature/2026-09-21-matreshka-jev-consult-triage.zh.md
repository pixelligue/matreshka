# Agent Note: Jev skip / proceed / consult

Status: implemented

[English](2026-09-21-matreshka-jev-consult-triage.md) | 中文

## 问题

咨询闸门把每个真实任务都标成 `consult`，因此简单信件和 CRM 创建也会调用 Flash。操作员希望 advisor 只出现在困难或有风险的请求上。Jev 已经能在命名选项中分类。

## 决定

在用户回合第一步，Jev 在 `skip`、`proceed` 和 `consult` 中选择。`skip` 是闲聊。`proceed` 是一个清楚的简单任务，不调用 Flash。`consult` 是混乱、冲突、道歉或高风险请求，仍调用 Flash。Host 仍走 `/v1/tools/select`；只有 `consult` 再调用 `/v1/consult`。

## 考虑过的替代方案

- **保持二元 consult/skip，且「有任务就 consult」。** 未采用：普通工作也会打 advisor。
- **再用一个模型判断复杂度。** 未采用：Jev Decisions 已经能在三个名字中选择。

## 后果

简单操作请求不再消耗 Flash。直播探测必须断言三档，而不是两档。临界提示可能在 `proceed` 与 `consult` 之间翻转；调的是指令文本。
