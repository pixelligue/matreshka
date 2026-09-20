# Agent Note: Matreshka 费用分析报告

Status: implemented

[English](2026-09-20-matreshka-cost-analytics-report.md) | 中文

## 问题

[用量账本](2026-09-20-matreshka-upstream-usage-ledger.zh.md)记录费用，但只提供 JSON。[Desktop Aptabase 应用](2026-09-18-matreshka-aptabase-analytics.zh.md)显示产品事件，而内置图表统计事件数量，不会对金额属性求和。操作员需要可读的每日报告，同时不能把估算价格当作已确认费用，也不能混加不同货币。

## 决定

API 根据 `usage_events` 提供操作员费用页面和需要 Bearer 认证的每日报告。报告按日期、操作、服务商、模型、状态、货币和费用来源分组。页面仅在内存中保存 Bearer，并将 RUB、USD、已报告费用、标价估算和未知金额分开。页面外壳公开，但没有有效的 Matreshka API 会话就无法取得用量数据。

用量记录提交后，API 可选择向单独的自托管 Aptabase 应用发送一条只含元数据的 `upstream_usage` 事件。该投影不含用户 ID、邮箱、提示词和结果文本，也不含服务商请求 ID。Aptabase 投递有数量和时间限制，异步且尽力而为；分析服务不可用时数据库仍是权威来源。独立 App Key 防止服务端事件改变 Desktop 会话数量。

## 考虑过的替代方案

- **把 Aptabase 事件属性当作财务报告。** 未采用，因为其仪表盘图表统计事件数量，不对数字费用属性求和。
- **通过 Desktop 发送费用事件。** 未采用，因为 API 调用可能不经过 Desktop，且 Desktop 投递可能被禁用或丢失。
- **修改 Aptabase 服务端界面。** 未采用，因为这需要维护独立分析产品的分支，而 API 可以根据自己的账本计算报告。

## 后果

操作员配置第二个 Aptabase 应用后，可在分析服务中查看请求数量。费用页面运行在 API 地址上，需要单独登录 Matreshka API。服务中断或关闭时分析事件可能丢失；已认证的数据库报告仍显示已提交记录。Desktop 直接发出的 Keenable 调用和账本上线前的历史仍不包含在总额中。
