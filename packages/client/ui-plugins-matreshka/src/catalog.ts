/** Built-in CIS plugin ids shown in the catalog. Documents are not listed. */

export const PLUGIN_IDS = ['amocrm', 'bitrix24', 'tilda', 'hotels'] as const

/** One catalog plugin id. */
export type PluginId = (typeof PLUGIN_IDS)[number]

/** Sidebar panellist id and matching `main` key. */
export const PLUGIN_PANEL_ID = 'plugins'

/** Plugins that accept a FastAPI connection. Amadeus hotels uses the product key. */
export const CONNECTABLE_IDS = ['amocrm', 'bitrix24', 'tilda'] as const

/** Locale keys for one catalog card. */
export interface PluginCardCopy {
  readonly title: PluginId
  readonly description: `${PluginId}.description`
}

/** Catalog cards in display order. */
export const PLUGIN_CARDS: readonly PluginCardCopy[] = [
  { title: 'amocrm', description: 'amocrm.description' },
  { title: 'bitrix24', description: 'bitrix24.description' },
  { title: 'tilda', description: 'tilda.description' },
  { title: 'hotels', description: 'hotels.description' },
]

/**
 * Return whether the catalog lists a connect form for this plugin.
 * @param id - catalog plugin id.
 * @returns true for amoCRM, Bitrix24, and Tilda.
 */
export function isConnectable(id: PluginId): id is (typeof CONNECTABLE_IDS)[number] {
  return (CONNECTABLE_IDS as readonly string[]).includes(id)
}
