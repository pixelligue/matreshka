## 1. App shell

- [x] 1.1 Add `apps/landing` as `@deepseek-ai/dsh-landing` (Next.js App Router, Tailwind v4, TypeScript, port 3020), add root scripts `dev:landing` / `build:landing`, and verify `pnpm --filter @deepseek-ai/dsh-landing run build` succeeds
- [x] 1.2 Copy `matreshka-logo.png` and CIS plugin marks into `apps/landing/public/`, add `ru`/`en` dictionaries with default Russian at `/` and English at `/en`, and verify both routes render without a session cookie

## 2. Page

- [x] 2.1 Build the Codex-ordered page (header, hero, integrations strip, product window, alternating feature blocks, three cards) and verify a desktop viewport shows Matreshka, the nesting-doll mark, amoCRM/Bitrix24/Tilda/Amadeus, and the three cards Desktop / Plugins / Matrena
- [x] 2.2 Wire `MATRESHKA_WINDOWS_DOWNLOAD_URL` (visible disabled control when unset), keep the mark still under `prefers-reduced-motion`, and verify visible copy has no OpenAI, Codex, ChatGPT, or DeepSeek Harness product name

## 3. Checks

- [x] 3.1 Add a focused test that `/` is Russian (Matreshka + Windows download label) and `/en` is English, and verify the test passes

## 4. Real Desktop shots and everyday copy

- [x] 4.1 Remove the services logo strip, rewrite visitor copy for ordinary operators (no programming pitch), and verify the page has no amoCRM/Bitrix24/Tilda/Amadeus trusted-by row
- [x] 4.2 Launch Desktop, run everyday Matrena tasks, capture real GUI shots into `apps/landing/public/shots/`, and verify the landing uses those captures

## 5. Matrena evaluation page

- [x] 5.1 Replace the home comparison image with a Matrena score banner that links to `/matrena` and `/en/matrena`, and verify the banner prints published Matrena scores
- [x] 5.2 Build the editorial evaluation page with the published comparison table and honest notes, and verify it does not claim Matrena leads every board
