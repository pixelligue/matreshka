## Context

See proposal.md. There is no marketing app today: `apps/web` is the product GUI, `website/` is VitePress docs. The layout reference is `https://openai.com/ru-RU/codex/` (nav, centered hero, integrations, app window, alternating screenshot+copy, three cards). Brand assets already exist: `apps/web/public/matreshka-logo.png` and CIS plugin marks under `apps/web/public/plugin-marks/`.

The operator named the stack as Nest.js + Tailwind. This change uses **Next.js** (App Router) + Tailwind CSS. NestJS is a backend framework and stays a non-goal.

## Goals / Non-Goals

**Goals:** One Next.js app that reproduces the Codex page composition with Matreshka identity and Russian-first copy.

**Non-Goals:** NestJS server, waitlist persistence, installer hosting, cloning OpenAI wordmarks or Codex screenshots.

## Decisions

### 1. New app `apps/landing`, not `apps/web` or `website/`

`pnpm-workspace.yaml` already includes `apps/*`. Package name `@deepseek-ai/dsh-landing` (`private: true`) matches other apps. Root scripts: `dev:landing`, `build:landing`.

Alternative: Vite + React in `website/`. Rejected: docs site stays VitePress; the operator asked Next.js.

### 2. Next.js App Router + Tailwind v4

App Router, TypeScript, `app/[locale]/page.tsx` with `ru` default (`/`) and `en` (`/en`). Dictionaries live in the landing app (`locales/ru.ts`, `locales/en.ts`), not in `ui-settings-models`. Tailwind v4 via `@tailwindcss/postcss`. Dev port `3020` so it does not collide with Aptabase (`8000`), FastAPI (`8016`), or the web GUI (`8080`).

### 3. Copy the Codex composition, keep Matreshka identity

Follow the reference section for section:

| Codex | Matreshka |
|---|---|
| OpenAI header + Try ChatGPT | Nesting-doll + Matreshka; primary “Скачать для Windows” |
| Blossom icon + “Codex” | Nesting-doll PNG + “Matreshka” |
| One-line pitch | One-line Matrena pitch |
| NVIDIA / Shopify strip | Omitted. Directly under the hero: a quiet Matrena score banner (SWE 79.0, Terminal-bench 2.1 91.4, τ2 Telecom 95.0) that opens `/matrena`. The evaluation page prints the published comparison table; a hyphen means no publication. |
| App window under hero | Real Desktop capture in a window frame |
| Alternating copy + UI | Same rhythm; everyday-operator copy; real Desktop shots (chat, plugins, a finished task) |
| Three cards (ChatGPT / IDE / CLI) | Desktop Windows, Plugins, Matrena |

Light page, soft cool wash behind the hero, black pill buttons, large sans headlines. Do not use the OpenAI blossom, purple ChatGPT wordmark, or Codex UI captures.

Windows download href is `process.env.MATRESHKA_WINDOWS_DOWNLOAD_URL`. Empty: button visible, `aria-disabled`, no navigation.

### 4. Product visuals

Launch unpackaged Desktop (`pnpm run start:desktop`) with the product API, sign in, run short everyday Matrena tasks, and capture the renderer. Store PNGs under `apps/landing/public/shots/`. Do not use generated mock UI. Copy `matreshka-logo.png` into `apps/landing/public/`. Plugin marks stay in the Desktop catalog shot only.

### 5. Motion

Optional short tumbler wobble on the hero mark, static under `prefers-reduced-motion`. No scroll-hijack, no marquee.

## Risks / Trade-offs

- **[Risk] Next.js is a new workspace toolchain** (not Vite like `apps/web`). → Keep the app isolated; do not fold it into the client tsconfig solution. Allow Next’s install script in `pnpm-workspace.yaml` only if pnpm requires it.
- **[Risk] Fake social proof.** → There is no trusted-by strip. Plugins appear only as a real catalog screenshot plus everyday copy.
- **[Trade-off] No live installer.** → CTA stays; URL is config. Shipping the NSIS feed is a later desktop-updates change.
- **[Trade-off] Looks like Codex.** → Intended for v1 layout. Brand mark and copy keep it Matreshka.

## Migration Plan

`pnpm --filter @deepseek-ai/dsh-landing run dev` on 3020. Rollback: remove `apps/landing` and the root scripts. No Desktop or API migration.

## Open Questions

None that block the spec. Installer URL can stay unset.
