## 1. Plugins tab

- [x] 1.1 Register a locale-owned Plugins row on `sidebar.panellist` under New session, open a catalog pane that hides chat, and verify sidebar tests for order, collapsed icon, and leaving via New session

## 2. Catalog of four

- [x] 2.1 Render amoCRM, Bitrix24, Tilda, and Hotels cards with enable/connect status, omit Documents, and verify the catalog lists exactly those four ids

## 3. Host gating

- [x] 3.1 Load each enabled plugin's skill into new sessions, keep Word/Excel/PDF internal, and verify disable removes the skill from the next session

## 4. Backend connections

- [x] 4.1 Add session-auth `GET/POST /v1/plugins/{id}` connect/status/call for amocrm, bitrix24, and tilda (secrets stored, never echoed), hotels without a partner key, and verify 401, 409 when disconnected, and redacted errors
