# Agent Note: Matreshka cost analytics report

Status: implemented

English | [中文](2026-09-20-matreshka-cost-analytics-report.zh.md)

## Problem

The [usage ledger](2026-09-20-matreshka-upstream-usage-ledger.md) records costs but exposes only JSON. The [Desktop Aptabase app](2026-09-18-matreshka-aptabase-analytics.md) shows product events, while its built-in graphs count events rather than sum monetary properties. Operators need a readable daily report without treating an estimated price as a confirmed charge or adding different currencies.

## Decision

The API serves an operator cost page and a bearer-protected daily report from `usage_events`. The report groups by day, operation, provider, model, status, currency, and charge source. The page holds its bearer only in memory and keeps RUB, USD, reported charges, rate estimates, and unknown amounts separate. The page shell is public, but no usage data is returned without a valid Matreshka API session.

After a usage row commits, the API optionally sends one metadata-only `upstream_usage` event to a separate self-hosted Aptabase app. The projection omits user IDs, emails, prompt and result text, and provider request IDs. Aptabase delivery is bounded, asynchronous, and best effort; the database remains authoritative if analytics is unavailable. A distinct App Key prevents server events from changing Desktop session counts.

## Alternatives considered

- **Use Aptabase event properties as the financial report.** Rejected because its dashboard graphs event counts, not sums of numeric cost properties.
- **Send cost events through Desktop.** Rejected because API calls can occur without Desktop and Desktop delivery can be disabled or lost.
- **Modify the Aptabase server UI.** Rejected because that requires maintaining a fork of a separate analytics product for a report the API can compute from its own ledger.

## Consequences

Operators configure a second Aptabase app to see request counts in analytics. The cost page runs on the API origin and requires a separate Matreshka API sign-in. Analytics events can be dropped during outages or shutdown; the authenticated database report continues to show committed rows. Direct Desktop Keenable calls and pre-ledger history remain outside these totals.
