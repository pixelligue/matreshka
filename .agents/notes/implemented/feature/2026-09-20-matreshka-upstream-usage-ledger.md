# Agent Note: Matreshka upstream usage ledger

Status: implemented

English | [中文](2026-09-20-matreshka-upstream-usage-ledger.zh.md)

## Problem

Harness session logs contain model token counts but cannot reconcile title calls, failed attempts, OpenRouter consultations, and provider charges for one product user. Account balances combine unrelated requests, and a token count alone is not a paid amount.

## Decision

The product API writes one `usage_events` row per authenticated upstream attempt through chat, consult, tool select, or its web-search route. Rows belong to the authenticated user and contain only operation metadata, status, reported tokens, byte counts, optional provider request ID, and optional monetary amount. Chat streaming writes its row when the stream closes, including interrupted streams; non-streaming routes write after the upstream attempt. The API exposes user-scoped event and grouped-summary reads.

Money is stored as integer billionths of its named currency. A reported provider charge, an OpenRouter list-rate estimate, and an unknown charge remain distinct. Missing usage never becomes zero usage or a zero charge. The database write is best effort after an upstream attempt so accounting failure cannot replace a model or tool response.

## Alternatives considered

- **Reconstruct costs only from Harness session logs.** Rejected because those logs omit title-request usage, provider charges, and some failed attempts; they also cannot identify all OpenRouter and search calls.
- **Persist full request and response bodies.** Rejected because prompts, tool results, and credentials are unnecessary for cost accounting and would increase sensitive data retention.
- **Use current public prices as billed amounts.** Rejected because discounts, trials, changing prices, and provider-side charges can differ from a rate calculation; the ledger labels rate calculations as estimates.
- **Move direct Keenable desktop traffic through the API.** Deferred because it changes the existing web transport for requests whose public endpoint currently reports no charge. Harness session logs still expose those tool calls.

## Consequences

Existing sessions are not backfilled. Chat rows include title generation but do not identify it separately. Direct Keenable desktop search and fetch remain outside the API ledger. Provider responses that omit usage or charge leave those fields null, and a database outage after an upstream attempt can leave a gap; the server logs that failure without changing the upstream result.
