# Agent Note: Matreshka public landing

Status: implemented

English | [中文](2026-09-18-matreshka-landing.zh.md)

## Problem

Matreshka had a desktop product and no public marketing page. Putting that story into `apps/web` or the VitePress docs site would mix GUI, documentation, and acquisition.

## Decision

A private Next.js App Router app lives at `apps/landing` (`@deepseek-ai/dsh-landing`, port 3020). Tailwind CSS styles a Codex-ordered home page: header, hero, a Matrena score banner, real Desktop window, alternating features, three cards. `/matrena` (English `/en/matrena`) is an editorial evaluation page: published scores, a comparison table, and notes that do not claim Matrena leads every board. Scores live in `src/benchmarks.ts`; a hyphen means no publication. There is no “services you already use” logo strip. Copy is for ordinary operators (ask Matrena, get a result), Russian at `/` and English at `/en`. Product shots are captures from unpackaged Desktop after real Matrena turns. The app is not an npm release member. Windows download uses `MATRESHKA_WINDOWS_DOWNLOAD_URL` and stays visible when unset.

## Alternatives considered

**NestJS as the landing server.** Rejected: NestJS is a backend framework. The operator asked for a frontend landing; Next.js is the App Router match for Tailwind.

**Ship inside `website/` or `apps/web`.** Rejected: VitePress is docs; `apps/web` is the signed-in GUI.

**Publish the app as a dsh npm release member.** Rejected: a marketing site is not a runtime package.

## Consequences

`pnpm run dev:landing` serves the page without a session. Visuals are Desktop captures, not generated mock UI. Desktop, FastAPI, and the GUI are unchanged.
