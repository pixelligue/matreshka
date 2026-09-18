# Agent Note: Flash consultant and Jev tool select

Status: implemented

English | [中文](2026-09-18-matreshka-flash-consultant.zh.md)

## Problem

Matrena is the only chat model. Hard coding and analysis steps needed a cheap second opinion without putting another model in the picker or sending OpenRouter keys to the desktop.

## Decision

The API exposes `POST /v1/consult` (OpenRouter `deepseek/deepseek-v4.1-flash`, 32k UTF-8 cap) and `POST /v1/tools/select` (OpenRouter Decisions `typesafe/jev-1.13`, 16k UTF-8 cap). `OPENROUTER_API_KEY` is optional at process start; missing key returns 503. Host package `@deepseek-ai/dsh-consult-matreshka` registers `consult` and `select_tool` with the session bearer, same pattern as web-search-matreshka. Chat `model` stays `matrena`.

## Alternatives considered

- **Muse Spark 1.3 Contributor as the consultant.** Rejected: Meta trains on prompts and completions, including user code.
- **Jev as the consultant.** Rejected: Jev does not generate text; it only answers typed questions. It stays on tool choice.

## Consequences

- Consult and select do not run unless Matrena calls the tools. Trivial turns stay on LLMTOKENAPI only.
- Live consults need `OPENROUTER_API_KEY` in `backend/.env`.
