/** Browser posts to the Matreshka CIS plugin API with the session bearer. */

import { PLUGIN_IDS, type PluginId } from '../catalog.ts'

/** Default Matreshka API origin (same as Host apiOrigin). */
export const DEFAULT_MATRESHKA_API_ORIGIN = 'http://127.0.0.1:8016'

/** sessionStorage key shared with the sign-in surface. */
export const MATRESHKA_SESSION_TOKEN = 'MATRESHKA_SESSION_TOKEN'

/** Browser event fired after the local session is written or cleared. */
export const SESSION_EVENT = 'matreshka-session'

/** One catalog row from `GET /v1/plugins`. */
export interface PluginStatus {
  readonly id: PluginId
  readonly enabled: boolean
  readonly connected: boolean
}

/** Snapshot the catalog pane subscribes to. */
export interface CatalogSnapshot {
  readonly signedIn: boolean
  readonly plugins: readonly PluginStatus[]
  readonly error: string | undefined
}

/** Fields posted to `POST /v1/plugins/{id}/connect`. */
export interface ConnectFields {
  readonly subdomain?: string
  readonly token?: string
  readonly webhook_url?: string
  readonly public_key?: string
  readonly secret_key?: string
}

/** Empty catalog used before the first load and when signed out. */
export const EMPTY_CATALOG: CatalogSnapshot = {
  signedIn: false,
  plugins: PLUGIN_IDS.map(id => ({ id, enabled: false, connected: false })),
  error: undefined,
}

/**
 * Read the current Matreshka session token from sessionStorage.
 * @returns the bearer, or an empty string when signed out.
 */
export function sessionToken(): string {
  try {
    return localStorage.getItem(MATRESHKA_SESSION_TOKEN)
      ?? sessionStorage.getItem(MATRESHKA_SESSION_TOKEN)
      ?? ''
  } catch {
    return ''
  }
}

/**
 * Parse a plugin-status JSON payload.
 * @param value - decoded JSON.
 * @returns a status row, or undefined when the payload is not a known plugin.
 */
export function parsePluginStatus(value: unknown): PluginStatus | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const row = value as { id?: unknown; enabled?: unknown; connected?: unknown }
  if (typeof row.id !== 'string' || !(PLUGIN_IDS as readonly string[]).includes(row.id)) return undefined
  return {
    id: row.id as PluginId,
    enabled: row.enabled === true,
    connected: row.connected === true,
  }
}

/**
 * Merge API rows onto the four catalog ids so Documents never appears.
 * @param rows - statuses returned by the API.
 * @returns exactly the four built-in plugins.
 */
export function mergeCatalog(rows: readonly PluginStatus[]): readonly PluginStatus[] {
  const byId = new Map(rows.map(row => [row.id, row]))
  return PLUGIN_IDS.map(id => byId.get(id) ?? { id, enabled: false, connected: false })
}

/**
 * GET `/v1/plugins` with the session bearer.
 * @param apiOrigin - Matreshka API origin.
 * @param token - session bearer.
 * @param fetcher - HTTP carrier.
 * @returns catalog snapshot.
 */
export async function fetchCatalog(
  apiOrigin: string,
  token: string,
  fetcher: typeof fetch = fetch,
): Promise<CatalogSnapshot> {
  if (token.length === 0) return EMPTY_CATALOG
  const response = await fetcher(`${originOf(apiOrigin)}/v1/plugins`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`plugins list HTTP ${String(response.status)}`)
  const payload: unknown = await response.json()
  if (!Array.isArray(payload)) throw new Error('plugins list is not an array')
  return {
    signedIn: true,
    plugins: mergeCatalog(payload.flatMap((row) => {
      const parsed = parsePluginStatus(row)
      return parsed === undefined ? [] : [parsed]
    })),
    error: undefined,
  }
}

/**
 * POST enable or connect and return the updated status row.
 * @param apiOrigin - Matreshka API origin.
 * @param token - session bearer.
 * @param path - API path after `/v1/plugins/`.
 * @param body - JSON body.
 * @param fetcher - HTTP carrier.
 * @returns the updated plugin status.
 */
export async function postPlugin(
  apiOrigin: string,
  token: string,
  path: string,
  body: Record<string, unknown>,
  fetcher: typeof fetch = fetch,
): Promise<PluginStatus> {
  if (token.length === 0) throw new Error('Matreshka session is required')
  const response = await fetcher(`${originOf(apiOrigin)}/v1/plugins/${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`plugins write HTTP ${String(response.status)}`)
  const parsed = parsePluginStatus(await response.json())
  if (parsed === undefined) throw new Error('plugins write returned an unknown plugin')
  return parsed
}

function originOf(apiOrigin: string): string {
  return apiOrigin.replace(/\/$/, '')
}
