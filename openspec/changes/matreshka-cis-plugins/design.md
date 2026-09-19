## Context

See proposal.md. Sidebar already has `sidebar.panellist` and `selectPanel`. Skills load through `dsh-skill`. Web search is already a Host tool via `{apiOrigin}`. Documents stay internal.

## Goals / Non-Goals

**Goals:** Plugins tab + four CIS cards + backend-held credentials + skills/tools gated by enablement.

**Non-Goals:** Plugin store, document cards, hotel booking, Cordis manager.

## Decisions

### 1. Sidebar panellist, not footer

Register `id: plugins` on `sidebar.panellist` (order above workspaces). Main pane is a catalog when `activePanelId === 'plugins'`. Footer stays profile/settings/sign-out.

### 2. Four v1 plugins

| Id | Connect | Agent use |
|---|---|---|
| `amocrm` | Long-lived token (v1) or OAuth later. REST v4 leads/contacts. | List/create/update leads |
| `bitrix24` | Inbound webhook URL (simplest). REST crm.deal/contact. | Same CRM loop |
| `tilda` | Site publickey+secretkey (Business plan). GET pages/export. Forms via webhook to our API later. | List pages, fetch HTML, summarize |
| `hotels` | No partner key in v1 | Skill + existing web_search. No booking |

Word/Excel/PDF: internal skills only.

### 3. Why not free hotel booking APIs

Yandex Travel, Bronevik, Ostrovok B2B need a contract. OSM has places without prices. v1: search and summarize, link out. Partner API is a later plugin revision.

### 4. Secrets on FastAPI

Same pattern as OpenRouter: Desktop posts connect with session bearer; Postgres stores ciphertext; tools hit `/v1/plugins/{id}/call`. amoCRM long-lived token is enough for a private account; Bitrix webhook is enough for one portal.

### 5. Enable vs connect

Enable = skill on. Connect = tools can call upstream. Enabled-but-not-connected: skill may explain how to connect; tools return 409.

## Risks / Trade-offs

- **[Risk] Bitrix webhook is a standing secret.** → Store hashed at rest later; v1 treat like API keys, never log.
- **[Risk] Tilda API is read/export, not a page builder.** → Catalog copy MUST say we read/sync pages, not “generate a Tilda site”.
- **[Trade-off] Two CRMs.** → Separate plugins; operator may enable both.

## Migration Plan

Ship tab + empty connect; then one plugin at a time (Bitrix webhook first — fewest moving parts). Rollback: disable the panellist row.

## Open Questions

None that block the spec. amoCRM OAuth app registration waits until we have a Kommo/amo partner app id.
