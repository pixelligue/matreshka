/** Catalog snapshot store and Matreshka plugin API writes. */

import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { PluginId } from '../catalog.ts'
import {
  DEFAULT_MATRESHKA_API_ORIGIN,
  EMPTY_CATALOG,
  fetchCatalog,
  postPlugin,
  sessionToken,
  type CatalogSnapshot,
  type ConnectFields,
} from './api.ts'

/**
 * Owns the Plugins catalog snapshot. Enable and connect post to the
 * Matreshka API; the Desktop never stores provider secrets.
 */
export class PluginsController {
  /** Live catalog rows for the four built-in plugins. */
  readonly catalog: SnapshotStore<CatalogSnapshot> = createSnapshotStore<CatalogSnapshot>(EMPTY_CATALOG)

  /**
   * @param apiOrigin - Matreshka API origin.
   * @param fetcher - HTTP carrier.
   */
  constructor(
    private readonly apiOrigin: string = DEFAULT_MATRESHKA_API_ORIGIN,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  /**
   * Load current enablement and connection status.
   * @returns after the snapshot is published.
   */
  async load(): Promise<void> {
    try {
      this.catalog.set(await fetchCatalog(this.apiOrigin, sessionToken(), this.fetcher))
    } catch {
      this.catalog.set({ ...EMPTY_CATALOG, signedIn: sessionToken().length > 0, error: 'requestFailed' })
    }
  }

  /**
   * Enable or disable one catalog plugin.
   * @param id - catalog plugin id.
   * @param enabled - next enablement.
   */
  async enable(id: PluginId, enabled: boolean): Promise<void> {
    await this.write(`${id}/enable`, { enabled })
  }

  /**
   * Store a provider credential on the API. The response never echoes the secret.
   * @param id - catalog plugin id.
   * @param fields - connect body for that plugin.
   */
  async connect(id: PluginId, fields: ConnectFields): Promise<void> {
    await this.write(`${id}/connect`, { ...fields })
  }

  private async write(path: string, body: Record<string, unknown>): Promise<void> {
    const previous = this.catalog.getSnapshot()
    try {
      const row = await postPlugin(this.apiOrigin, sessionToken(), path, body, this.fetcher)
      const plugins = previous.plugins.map(item => item.id === row.id ? row : item)
      this.catalog.set({ signedIn: true, plugins, error: undefined })
    } catch {
      this.catalog.set({ ...previous, error: 'requestFailed' })
    }
  }
}
