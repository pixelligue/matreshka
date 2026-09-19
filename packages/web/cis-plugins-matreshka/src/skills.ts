/** Bundled CIS plugin skill bodies. */
import type { PluginId } from './client.ts'

/** Bundled skill bodies keyed by catalog plugin id. */
export const SKILL_BODY: Record<PluginId, string> = {
  amocrm: `# amoCRM

Use the \`amocrm\` tool for the signed-in user's amoCRM account.

- List, read, and update leads, contacts, companies, and tasks through allowlisted REST v4 paths (\`leads\`, \`contacts\`, \`companies\`, \`tasks\`, \`leads/pipelines\`).
- If the tool says the plugin is not connected, tell the user to open Plugins, enable amoCRM, and save their subdomain plus long-lived token. Do not ask them to paste the token into chat.
- Never invent deal or contact ids. Read first, then update.
- Do not call amoCRM when the user only asked about Bitrix24, Tilda, or hotels.
`,
  bitrix24: `# Bitrix24

Use the \`bitrix24\` tool for the signed-in user's Bitrix24 CRM.

- Allowed methods: \`crm.deal.list\`, \`crm.deal.get\`, \`crm.deal.add\`, \`crm.deal.update\`, and the same \`list|get|add|update\` verbs for \`contact\`, \`company\`, and \`lead\`.
- If the tool says the plugin is not connected, tell the user to open Plugins and paste an inbound webhook URL. Do not ask them to paste the webhook into chat.
- Never invent CRM ids. Read first, then update.
`,
  tilda: `# Tilda

Use the \`tilda\` tool to list and export pages from the signed-in user's Tilda account (Business plan keys).

- Allowed methods: \`getprojectslist\`, \`getprojectinfo\`, \`getpageslist\`, \`getpage\`.
- You can summarize or copy exported HTML. You cannot generate or publish a Tilda site from chat.
- If the tool says the plugin is not connected, tell the user to open Plugins and save their public and secret keys. Do not ask them to paste the secret into chat.
`,
  hotels: `# Amadeus hotels

Use the \`hotels\` tool for Amadeus Self-Service hotel list and offers. There is no booking in this plugin.

- List hotels with path \`hotels/by-city\` and query \`cityCode\` as a 3-letter IATA city code (MOW, LED, PAR, NYC).
- Or path \`hotels/by-geocode\` with \`latitude\` and \`longitude\`.
- Get rates with path \`hotel-offers\` and query \`hotelIds\` (up to 20 Amadeus ids), plus \`checkInDate\` and \`checkOutDate\` as YYYY-MM-DD.
- Summarize names and public rates. Never claim you created a reservation or charged a card.
- If the tool says Amadeus is not configured, tell the user the product Amadeus key is missing.
`,
}
