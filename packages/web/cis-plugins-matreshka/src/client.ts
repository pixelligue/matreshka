/**
 * Session-bearer calls to the Matreshka CIS plugin API.
 * @module @deepseek-ai/dsh-cis-plugins-matreshka/client
 */

/** Default Matreshka API origin (same as Host apiOrigin). */
export const DEFAULT_MATRESHKA_API_ORIGIN = 'http://127.0.0.1:8016'

/** Built-in CIS plugin ids. Documents are not listed. */
export const PLUGIN_IDS = ['amocrm', 'bitrix24', 'tilda', 'hotels'] as const

/** One catalog plugin id. */
export type PluginId = (typeof PLUGIN_IDS)[number]

/** Plugins that expose a proxied tool. */
export const TOOL_PLUGIN_IDS = ['amocrm', 'bitrix24', 'tilda', 'hotels'] as const

/** Options shared by plugin API posts. */
export interface MatreshkaSessionOptions {
  /** Matreshka API origin, no trailing slash required. */
  apiOrigin: string
  /** Current Matreshka session token; empty means unavailable. */
  sessionToken: string
}

/** One row from `GET /v1/plugins`. */
export interface PluginStatus {
  readonly id: PluginId
  readonly enabled: boolean
  readonly connected: boolean
}

/** Body for {@link callPlugin}. */
export interface PluginCallInput {
  readonly method?: 'GET' | 'POST' | 'PATCH'
  readonly path: string
  readonly query?: Record<string, string>
  readonly body?: unknown
}

/**
 * GET `/v1/plugins` and return enabled plugin ids.
 * @param options - API origin and session token.
 * @param signal - optional abort signal.
 * @returns enabled plugin ids; empty when unsigned or the API fails.
 */
export async function listEnabledPlugins(
  options: MatreshkaSessionOptions,
  signal?: AbortSignal,
): Promise<readonly PluginId[]> {
  if (options.sessionToken.length === 0) return []
  let response: Response
  try {
    response = await fetch(`${originOf(options.apiOrigin)}/v1/plugins`, {
      method: 'GET',
      redirect: 'error',
      headers: {
        authorization: `Bearer ${options.sessionToken}`,
        accept: 'application/json',
      },
      ...signal !== undefined ? { signal } : {},
    })
  } catch {
    return []
  }
  if (!response.ok) return []
  const payload: unknown = await response.json()
  if (!Array.isArray(payload)) return []
  return payload.flatMap((row): PluginId[] => {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) return []
    const item = row as { id?: unknown; enabled?: unknown }
    if (typeof item.id !== 'string' || !(PLUGIN_IDS as readonly string[]).includes(item.id)) return []
    if (item.enabled !== true) return []
    return [item.id as PluginId]
  })
}

/**
 * POST `/v1/plugins/{id}/call` with the session bearer.
 * @param options - API origin and session token.
 * @param pluginId - connected plugin id.
 * @param input - allowlisted upstream path and payload.
 * @param signal - optional abort signal.
 * @returns the upstream JSON object.
 */
export async function callPlugin(
  options: MatreshkaSessionOptions,
  pluginId: (typeof TOOL_PLUGIN_IDS)[number],
  input: PluginCallInput,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  if (options.sessionToken.length === 0) {
    throw new Error('Matreshka session is required for plugin calls')
  }
  let response: Response
  try {
    response = await fetch(`${originOf(options.apiOrigin)}/v1/plugins/${pluginId}/call`, {
      method: 'POST',
      redirect: 'error',
      headers: {
        authorization: `Bearer ${options.sessionToken}`,
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        method: input.method ?? 'GET',
        path: input.path,
        ...input.query !== undefined ? { query: input.query } : {},
        ...input.body !== undefined ? { body: input.body } : {},
      }),
      ...signal !== undefined ? { signal } : {},
    })
  } catch (error: unknown) {
    throw new Error(`Matreshka plugin request failed: ${String(error)}`, { cause: error })
  }
  if (response.status === 409) {
    throw new Error('This plugin is disabled or not connected. Ask the user to enable and connect it in Plugins.')
  }
  if (!response.ok) {
    throw new Error(`Matreshka plugin API error (HTTP ${String(response.status)})`)
  }
  const payload: unknown = await response.json()
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new Error('Matreshka plugin API returned an unprocessable body')
  }
  return payload as Record<string, unknown>
}

function originOf(apiOrigin: string): string {
  return apiOrigin.replace(/\/$/, '')
}
