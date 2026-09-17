## Context

See proposal.md. `matreshka-gui-chrome` already registers `ru` beside `zh`/`en` and defaults the Client to Russian on `ru*` OS locales. Almost every `ru` object still copies `en` values. Observed exceptions with real Cyrillic: `ui-sidebar`, `ui-settings-general`, and the sign-in keys in `ui-settings-models`. Desktop `apps/desktop/src/locale.ts` still has only `en`/`zh` and maps every non-`zh*` locale to English, which is why the window shows `Application`. `scripts/locale-dictionary-parity.spec.ts` compares `zh`/`en` keys only; it never reads `ru` values. Backend is untouched.

## Goals / Non-Goals

**Goals:**

- Fill every registered Client `ru` dictionary with Russian product wording.
- Add Desktop `ru` and resolve `ru*` to it.
- Gate `ru` key parity and reject English clones except language-neutral tokens.

**Non-Goals:**

- Do not change Client default-language or picker behavior.
- Do not extend `localeOf` discovery to invent new dictionary naming shapes.
- Do not re-record English-pinned web snapshots unless a case asserts Russian.

## Decisions

### 1. Translate values in place; keep zh as the key-set source

Edit existing `export const ru` (and `accessRu`) objects. Do not replace zh as the compile-time key union. Client plugins already call `ctx.locale.register(NS, { zh, en, ru })`.

Alternative: generate ru from zh at build time — rejected; wording must be authored Russian, not machine-copied Chinese.

### 2. Gate ru keys and clone values next to zh/en parity

Extend `scripts/locale-dictionary-parity.spec.ts` (or a sibling spec in `scripts/`) so discovery also admits `ru` / `Ru` the same way it admits `zh`/`en`. Assert:

1. Every `zh`/`en` pair has a `ru` counterpart with the same keys.
2. For each key, if `ru[key] === en[key]`, the value MUST be language-neutral.

Language-neutral means the whole string is on an explicit allowlist of tokens (tool names, `HTTP`, `px`, `PTC`, `EXP`, `TTFT`, `TPS`, file types, brand names, placeholder-only strings). Do not allow a sentence-length English clone.

Desktop dictionaries are outside that Client sweep; `apps/desktop/tests/locale.spec.ts` asserts the same key set and `ru*` resolution.

Alternative: require Cyrillic in every ru value — rejected; units and brand names have none.

### 3. Desktop locale id grows to include `ru`

Add `ru satisfies DesktopMessages`. `resolveDesktopLocale`: `ru*` → `{ id: 'ru', messages: ru }`, existing `zh*` → Chinese, else English. Keep formatDesktopMessage unchanged.

Alternative: reuse Client locale in Electron — rejected; the shell has no Cordis locale service.

### 4. Tests pin Russian only where locale is Russian

Keep existing e2e/snapshot cases on English unless they already run under `ru`. Add or extend jsdom specs that set locale to `ru` and assert the empty-session chrome is not the English source strings. Desktop locale spec covers `ru-RU` vs `en-US`.

## Risks / Trade-offs

- **[Risk] Allowlist drift as new tokens appear.** → Fail closed: a new English clone without an allowlist entry is a gate failure; add the token only when it is truly language-neutral.
- **[Risk] Large dictionary diff, uneven tone.** → Match the already-shipped Russian (`Новая сессия`, `Настройки`): infinitive/impersonal product Russian, not a new voice.
- **[Trade-off] zh remains in source and is not a product language.** → Unchanged from `matreshka-gui-chrome`.

## Migration Plan

No operator data migration. Existing `locale.preference` values keep working. After apply, a Russian OS session shows Russian chrome without a settings change.

## Open Questions

None. Exact Russian phrasing is apply-time as long as it is not the English source and placeholders match.
