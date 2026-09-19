# Agent Note: Matreshka CIS plugins catalog

Status: implemented

English | [中文](2026-09-18-matreshka-cis-plugins.zh.md)

## Problem

CIS operators need a ChatGPT-style Plugins catalog for amoCRM, Bitrix24, Tilda, and hotel search. The harness plugin manager, Settings, and internal Word/Excel/PDF skills are the wrong surfaces: the first two expose Cordis composition, and documents must stay internal rather than become catalog cards. Provider tokens must not live in Desktop or the session log.

## Decision

Matreshka ships three coordinated pieces: a sidebar Plugins tab, FastAPI-held connections, and Host skills/tools gated by enablement.

- **Tab.** `@deepseek-ai/dsh-client-ui-plugins-matreshka` registers `sidebar.panellist` id `plugins` at order 10 (under New session, above Workspaces) and a keyed `main` occupant `plugins`. Selecting it hides chat; New session and workspace session selection already call `layout.selectPanel(null)` and restore chat. Copy is locale-owned (RU/EN/ZH).
- **Catalog.** The pane lists exactly amoCRM, Bitrix24, Tilda, and Amadeus. Cards use the services' brand marks. There is no CIS subtitle. Word, Excel, and PDF are omitted. Enable and connect POST to `/v1/plugins/{id}/enable` and `/connect` with the session bearer. Amadeus (`hotels`) uses the product API key, not a per-user connect form.
- **Backend.** `PluginConnection` stores per-user `enabled` plus a JSON secret. `POST /v1/plugins/{id}/call` proxies allowlisted amoCRM REST v4, Bitrix inbound webhook CRM methods, and Tilda export GETs. Unauthenticated writes are 401. Missing connection or a disabled plugin is 409. Upstream errors are 502 and never echo the secret. Hotels connect is 400.
- **Host.** `@deepseek-ai/dsh-cis-plugins-matreshka` lists skills from `GET /v1/plugins` (`complete: false` so a disable is visible on the next session list). Tools `amocrm`, `bitrix24`, `tilda`, and `hotels` call `/call`. Amadeus hotel list and offers use `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET` on FastAPI. No booking tool exists.

## Alternatives considered

- **Expose Word/Excel/PDF as catalog plugins.** Rejected: the operator asked for documents to stay internal skills, not public cards.
- **Store tokens on Desktop or in the session log.** Rejected: the same rule as OpenRouter — provider secrets stay on FastAPI and the session bearer is the only client credential.
- **Hotel booking via Yandex Travel, Bronevik, or Ostrovok.** Rejected for v1: those APIs need a partner contract. v1 searches and summarizes, then links out.
- **amoCRM OAuth multi-account in v1.** Deferred: a private account can use a long-lived token plus subdomain; OAuth waits on a partner app id.
- **Put CIS tools on the agent-preset plane.** Rejected: enablement is per signed-in user, and the skill registry's global layer is the host-plane place for deployment providers.

## Consequences

- Operators enable CIS integrations from the sidebar without opening Settings or the Cordis plugin manager.
- Matrena does not see a disabled plugin's skill on the next session; a connected-but-disabled or unconnected tool call fails closed with 409.
- Desktop never holds amo, Bitrix, or Tilda secrets. A leaked session log cannot replay those credentials.
- Hotel search cannot create a paid booking in v1.
