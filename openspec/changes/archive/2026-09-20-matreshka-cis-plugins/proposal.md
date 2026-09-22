## Why

Matreshka operators in the CIS need a ChatGPT-style Plugins surface: a catalog of named integrations they can turn on, not the Cordis plugin manager. Word/Excel/PDF stay internal skills. The first public catalog is amoCRM, Bitrix24, Tilda, and hotel search.

## What Changes

- A **Плагины** row in the sidebar panellist, under New session and above Workspaces. Selecting it opens a full-pane catalog (chat hides). Collapsed rail shows an icon.
- Four built-in plugins: **amoCRM**, **Битрикс24**, **Тильда**, **Отели**. Each card has a title, short description, connect/enable, and status. Documents are not in this catalog.
- Enablement is per signed-in user. Enabled plugins inject a skill (and tools when connected). Disabled plugins are invisible to Matrena.
- Credentials stay on the FastAPI backend. Desktop never holds amo/Bitrix/Tilda secrets.
- Hotel search in v1 uses existing Matreshka web search plus a hotel skill. Partner booking APIs (Yandex Travel, Bronevik, Ostrovok B2B) are out until we have a contract.

## Non-goals

- No Word/Excel/PDF as catalog plugins (internal only).
- No Cordis plugin manager, no arbitrary `.dll` install.
- No GPT Store / third-party upload in v1.
- No Telegram, MAX, banks, 1C COM, or HH in this change.
- No hotel booking or payment.

## Capabilities

### New Capabilities

- `client/matreshka-plugins-tab`: sidebar Plugins panel and catalog UI.
- `host/matreshka-cis-plugins`: enablement, skills, and tools for the four plugins.
- `backend/plugin-connections`: store and proxy connected-account tokens for amoCRM, Bitrix24, and Tilda.

### Modified Capabilities

- None.

## Impact

- Client: `sidebar.panellist` row + main-pane catalog.
- Host: skill folders + tools gated by settings.
- Backend: OAuth/webhook connect routes; tokens in existing Postgres, not in the session log.
