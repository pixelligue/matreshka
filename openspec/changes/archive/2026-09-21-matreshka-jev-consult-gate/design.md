# Design

## Context

See proposal.md. `consult` and `select_tool` already post to FastAPI with the session bearer. The loop's `agent/pre-step` waterfall runs once per proposed step, after inbox claim, and may append logged user-role notices (same pattern as model-switch). Flash stays on `/v1/consult`. Jev stays on `/v1/tools/select`.

**Ownership:** Host plugin `@deepseek-ai/dsh-consult-matreshka`. No FastAPI change.

## Goals / Non-Goals

**Goals:** One Jev decision per user turn; Flash only on `consult`; fail open.

**Non-Goals:** Changing the chat proxy, hiding notices, or removing the mid-turn `consult` tool.

## Decisions

### 1. `agent/pre-step`, not the chat proxy

The Host agent loop already turns user inbox messages into a step. Gating there fires once per user turn, not on every tool-followup LLM call. The FastAPI chat proxy would re-run Jev on every round trip.

The listener always calls `next()`. It runs the gate only when `step === 1` and there is user-authored text. It appends a `createUserMessage` plugin notice after `next()`, so the notice is session-logged (model-visible ⟺ logged).

### 2. Reuse `/v1/tools/select` with candidates `skip`, `proceed`, and `consult`

No new Decisions schema. `skip` = greeting/chit-chat; `proceed` = one clear straightforward task; `consult` = messy, conflicting, apology/reputation, missing ids, or several asks. Only `consult` calls Flash.

### 3. Fail open

Missing session, 503 (no OpenRouter key), 502, abort after `next()`, or a choice other than `consult` leaves the step unchanged. Chat must not depend on OpenRouter being up.

## Risks / Trade-offs

- **[Risk] Extra Jev latency on every user turn.** → Jev is the cheap Decisions model; skip avoids Flash.
- **[Trade-off] Advisor notice may appear in Chat.** → Same class as model-switch notices; hiding it is a later UI change.
- **[Trade-off] Mid-turn `consult` tool remains.** → Matrena can still ask Flash on a later hard step.

## Migration Plan

Restart Host. Rollback: remove the pre-step listener.

## Open Questions

None.
