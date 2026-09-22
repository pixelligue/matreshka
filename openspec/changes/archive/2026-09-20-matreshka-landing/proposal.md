## Why

Matreshka has a desktop product and no public marketing page. Operators and partners need a site that names the product, shows what it does, and invites them in, without mixing that story into the Electron GUI or the VitePress docs site.

## What Changes

- A new Next.js (App Router) + Tailwind CSS app at `apps/landing`, in the existing `apps/*` pnpm workspace. Home has a Matrena score banner; `/matrena` is the editorial comparison page.
- The public page follows the OpenAI Codex marketing layout (`https://openai.com/ru-RU/codex/`): top nav, centered hero with mark + name + one-line pitch + Windows download, a real Desktop window under the hero, alternating screenshot+copy blocks, then a three-card row. There is no “services you already use” logo strip.
- Copy speaks to ordinary operators (ask Matrena, get a result), not to programmers. Product visuals are captures of the running Matreshka Desktop, not generated mock UI.
- Brand, copy, and screenshots are Matreshka (nesting-doll mark, Matrena). No OpenAI, Codex, ChatGPT, or DeepSeek Harness product naming.
- Copy is locale-owned Russian first, with English.
- Independent of `apps/web` (product GUI) and `website/` (docs).

## Non-goals

- No NestJS backend, waitlist API, payments, or FastAPI routes in this change.
- No installer download pipeline or auto-update feed on the page.
- No restyle of Desktop, Chat, sidebar, or sign-in.
- No VitePress / `website/` rebrand.
- No signup, blog, docs, or plugin store on the landing.

## Capabilities

### New Capabilities

- `web/matreshka-landing`: public Next.js + Tailwind marketing page for Matreshka.

### Modified Capabilities

- None.

## Impact

- **Upstream seam:** new app `apps/landing` (Next.js + Tailwind). Workspace already includes `apps/*`. Root scripts may add `dev:landing` / `build:landing`.
- Does not change Cordis, Electron, FastAPI, or `apps/web`.
- Reuses `apps/web/public/matreshka-logo.png` (copy into the landing public folder).
