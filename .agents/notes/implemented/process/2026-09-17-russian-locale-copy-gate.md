# Agent Note: Russian locale copy gate

Status: implemented

English | [中文](2026-09-17-russian-locale-copy-gate.zh.md)

## Problem

Client plugins already register `ru` dictionaries beside `zh` and `en`, and the GUI can default to Russian, but key-only parity cannot prove those values are Russian. An English clone such as `Workspaces` or `Into the Unknown` still resolves, so a Russian OS session shows mixed chrome.

## Decision

`scripts/locale-dictionary-parity.spec.ts` requires every `zh`/`en` pair to ship a `ru` counterpart with the same keys. Interpolation placeholder names must match English. A `ru` value that equals its English counterpart is allowed only when the string is language-neutral: an explicit token allowlist (tool names, units, protocol labels, brand-neutral product tokens, Host presenter fallbacks with no locale seat), an `http(s)` URL, or a string that has no Latin letters outside `{placeholders}`.

Desktop Electron copy is outside that Client sweep; `apps/desktop/src/locale.ts` ships `ru` and `resolveDesktopLocale` maps `ru*` OS locales to it.

This does not replace [locale-owned client UI copy](../architecture/2026-08-23-locale-owned-client-ui-copy.md): that note still owns that product wording must enter a typed dictionary. This note owns that the Russian dictionary must not clone English product copy.

## Alternatives considered

- **Require Cyrillic in every `ru` value.** Rejected because units, brand names, URLs, and `{placeholder}`-only strings have none and would fail a letter-class check.
- **Generate Russian from Chinese at build time.** Rejected because product wording must be authored Russian, not a machine copy of another locale.

## Consequences

A new English product-copy clone fails CI instead of shipping mixed chrome. Maintainers add a token to the allowlist only when the string is truly language-neutral. Date formats may reorder `{placeholder}` names; the check compares the name set, not appearance order.
