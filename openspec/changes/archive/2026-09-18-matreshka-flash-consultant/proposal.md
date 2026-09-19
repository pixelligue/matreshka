## Why

Matrena is the only model the operator talks to, and it is not strong enough on hard coding and analysis steps. We need a cheap second brain that reviews those steps, without putting another model in the picker or sending the full session to an expensive completion.

## What Changes

- The backend adds an authenticated consult path that calls OpenRouter `deepseek/deepseek-v4.1-flash` with a **short** payload (goal, plan snippet, evidence, question). Output is a short verdict, not a second agent loop.
- The backend adds an authenticated tool-select path that calls OpenRouter Decisions `typesafe/jev-1.13` with the tool catalog plus a tiny state; Jev returns a choice, not prose.
- Desktop/Host keep Matrena as the only chat model. A new Host tool posts consult/select to `{apiOrigin}` with the session bearer. OpenRouter and TypeSafe keys never leave the backend.
- Consult and Jev MUST cap input size. They MUST NOT receive the full 262k transcript.

## Non-goals

- No Muse Spark Contributor (Meta trains on prompts).
- No second model in the picker, hero, or settings.
- No advertised 1M context window and no silent compaction (separate change).
- Jev MUST NOT write code, compact history, or replace Matrena.
- Patient Retry for Matrena 502 is out of scope.

## Capabilities

### New Capabilities

- `backend/flash-consultant`: session-auth consult to OpenRouter DeepSeek V4.1 Flash with a hard input cap.
- `backend/jev-tool-select`: session-auth Jev decision that picks from the allowlisted tool names.
- `host/matreshka-consult`: Host tools that call those backend paths; Matrena remains the chat model.

### Modified Capabilities

- None.

## Impact

- Backend: new env `OPENROUTER_API_KEY`, routes under `/v1/consult` and `/v1/tools/select`, tests in `backend/tests`.
- Host/client: a small tool plugin (same pattern as web-search) plus a system-prompt hint when to consult vs pick a tool.
- Upstream seam: `backend/` FastAPI and Host tool registration — not a new LLM adapter in `packages/llm`.
