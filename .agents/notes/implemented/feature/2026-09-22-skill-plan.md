# Agent Note: Internal skill plan before Matrena

Status: implemented

English | [中文](2026-09-22-skill-plan.zh.md)

## Problem

Matrena starts a product or build request with no shared concept of the audience, the cut, or the live demo path. Jev already decides whether Flash should give a short verdict, and Flash already returns ok, revise, or risk. Neither step holds a skill, so the working model invents scope before it reads the repository.

## Decision

The API stores published `SKILL.md` files for the stacks Matrena is asked to build: frontend design, MCP, FastAPI, Django, Next.js, Tailwind, NestJS, Expo, React Native, Postgres, MySQL, and Bun. `GET /v1/skills` lists them. `POST /v1/skills/plan` sends the user request to Jev, which chooses `none` or one skill and returns that file. The OpenRouter key stays on the API.

On the first step of a user turn, unless Jev chose `skip`, the Host asks for that skill, writes it under the project `.dsh/skills` directory when the session cwd is known and otherwise under `DSH_HOME/skills`, and injects it as a `skill-invocation` instruction. The consultant still runs in the background when Jev chooses `consult`, and neither call is a model tool. Matrena is not told to announce a consultant. A failure does not block chat. The chat model remains `matrena`.

## Alternatives considered

- **Desktop SKILL.md files as the registry.** Rejected for this path: the pitch skills are product instructions owned by Matreshka, not files the operator edits per project.
- **Replace the consult verdict with the plan.** Rejected: ok/revise/risk still judges a risky request. The plan is an additional notice.
- **Let Matrena call a tool to fetch the plan.** Rejected: Jev runs before the working model, so the plan is present on the first step instead of waiting for a tool call.

## Consequences

- A product or build request can arrive at Matrena with a conceptual plan and an explicit refusal list.
- A letter or a greeting pays for no skill plan. A clear non-build task still asks Jev which skill applies and usually receives `none`.
- File notes are optional. When they are empty, the plan must say what to find instead of naming a path.
