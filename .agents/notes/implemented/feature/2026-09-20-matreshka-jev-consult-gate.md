# Agent Note: Jev consult gate

Status: implemented

English | [中文](2026-09-20-matreshka-jev-consult-gate.zh.md)

## Problem

Matrena decided from a prompt whether to call the Flash advisor, so greetings could still spend OpenRouter and hard requests could skip the advisor. Jev already picks among named options and was only used as `select_tool`.

## Decision

On `agent/pre-step` for step 1, Host posts the user text to `/v1/tools/select` with candidates `consult` and `skip`. `consult` then posts `/v1/consult` and appends a logged plugin notice `[advisor <verdict>] …`. `skip` does nothing. Errors fail open. Later steps in the turn do not repeat the gate. The mid-turn `consult` tool remains.

The chat proxy is unchanged so tool follow-ups do not re-run Jev. OpenRouter keys stay on FastAPI. Chat completions still use `matrena`.

## Alternatives considered

- **Gate inside `/v1/chat/completions`.** Rejected: every tool round-trip would call Jev.
- **Remove the `consult` tool.** Rejected: Matrena still needs Flash on a later hard step.

## Consequences

Every user turn pays one Jev Decisions call when a session token exists. Missing `OPENROUTER_API_KEY` still yields 503 from the API; the Host swallows that and chats anyway. The advisor notice may appear in Chat like other plugin notices.
