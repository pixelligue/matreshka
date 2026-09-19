/**
 * Host skills and tools for Matreshka CIS plugins, gated by FastAPI enablement.
 * @module @deepseek-ai/dsh-cis-plugins-matreshka
 */

import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import {
  BUNDLED_SKILL_RANK,
  type SkillCandidate,
  type SkillDefinition,
  type SkillProvider,
} from '@deepseek-ai/dsh-skill'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  callPlugin,
  DEFAULT_MATRESHKA_API_ORIGIN,
  listEnabledPlugins,
  PLUGIN_IDS,
  TOOL_PLUGIN_IDS,
  type PluginId,
} from './client.ts'
import { SKILL_BODY } from './skills.ts'

export {
  DEFAULT_MATRESHKA_API_ORIGIN,
  callPlugin,
  listEnabledPlugins,
  PLUGIN_IDS,
  TOOL_PLUGIN_IDS,
} from './client.ts'
export type { MatreshkaSessionOptions, PluginCallInput, PluginId, PluginStatus } from './client.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'cis-plugins-matreshka'

/** Services required to register skills and tools. */
export const inject = ['skills', 'tools']

/** Plugin config. */
export interface Config {
  /** Matreshka API origin. */
  apiOrigin?: string
}

/** Validated plugin config. */
export const Config: z<Config> = z.object({
  apiOrigin: z.string().default(DEFAULT_MATRESHKA_API_ORIGIN),
})

const SESSION_TOKEN = credentialRef('MATRESHKA_SESSION_TOKEN')
const PROVIDER_NAME = 'cis-plugins-matreshka'
const INVOCATION = { modelInvocable: true, userInvocable: true } as const

const SKILL_META: Record<PluginId, { description: string }> = {
  amocrm: {
    description: 'Read and update leads and contacts in the signed-in amoCRM account. Use when the user asks about amoCRM deals or contacts.',
  },
  bitrix24: {
    description: 'Work Bitrix24 CRM through the connected inbound webhook. Use when the user asks about Bitrix deals or contacts.',
  },
  tilda: {
    description: 'List and export Tilda pages for the connected Business account. Use when the user asks about their Tilda site. Do not generate Tilda sites.',
  },
  hotels: {
    description: 'Find hotels and rates through Amadeus. Do not book or charge. Use when the user asks for hotels in a city.',
  },
}

const TOOL_DESCRIPTION: Record<(typeof TOOL_PLUGIN_IDS)[number], string> = {
  amocrm: 'Call amoCRM REST v4 for the connected account. Paths: leads, contacts, companies, tasks, leads/pipelines. If not connected, tell the user to connect amoCRM in Plugins.',
  bitrix24: 'Call Bitrix24 CRM via the connected inbound webhook. Paths: crm.(deal|contact|company|lead).(list|get|add|update). If not connected, tell the user to connect Bitrix24 in Plugins.',
  tilda: 'Call Tilda export API. Paths: getprojectslist, getprojectinfo, getpageslist, getpage. If not connected, tell the user to connect Tilda in Plugins. Do not generate a Tilda site.',
  hotels: 'Search hotels through Amadeus. Paths: hotels/by-city (cityCode IATA), hotels/by-geocode (latitude, longitude), hotel-offers (hotelIds). Do not book or charge.',
}

/**
 * Register enabled CIS plugin skills and the proxied CRM, Tilda, and Amadeus tools.
 * @param ctx - plugin context.
 * @param config - optional API origin.
 */
export function apply(ctx: Context, config: Config = {}): void {
  const apiOrigin = Config(config).apiOrigin ?? DEFAULT_MATRESHKA_API_ORIGIN
  const session = {
    token: launchEnvironmentOf(ctx).get('MATRESHKA_SESSION_TOKEN')?.value ?? '',
  }
  ctx.inject(['credentials'], (credentialsCtx) => {
    const refresh = (): void => {
      void credentialsCtx.credentials.resolve(SESSION_TOKEN).then((hit) => {
        if (hit !== undefined && hit.value.length > 0) session.token = hit.value
      })
    }
    refresh()
  })
  const options = (): { apiOrigin: string; sessionToken: string } => ({
    apiOrigin,
    sessionToken: session.token,
  })

  const provider: SkillProvider = {
    name: PROVIDER_NAME,
    async list(lookup) {
      const enabled = await listEnabledPlugins(options(), lookup.signal)
      return {
        complete: false,
        candidates: enabled.map(id => candidateOf(id)),
      }
    },
    async get(entry) {
      if (!(PLUGIN_IDS as readonly string[]).includes(entry.name)) return undefined
      const id = entry.name as PluginId
      return definitionOf(id, SKILL_BODY[id])
    },
  }
  ctx.skills.registerProvider(() => provider)

  for (const pluginId of TOOL_PLUGIN_IDS) {
    ctx.tools.register(defineTool({
      name: pluginId,
      description: TOOL_DESCRIPTION[pluginId],
      parameters: {
        path: { type: 'string', required: true, description: 'Allowlisted upstream method or REST path.' },
        method: { type: 'string', description: 'HTTP method for amoCRM. Ignored for Bitrix and Tilda.' },
        query: { type: 'object', additionalProperties: true, description: 'Optional query string map.' },
        body: { type: 'object', additionalProperties: true, description: 'Optional JSON body.' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: true,
          properties: {},
        },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
      },
      isConcurrencySafe: () => true,
      async execute(args, exec) {
        const method = args.method === 'POST' || args.method === 'PATCH' || args.method === 'GET'
          ? args.method
          : 'GET'
        const query = asStringMap(args.query)
        const payload = await callPlugin(options(), pluginId, {
          path: args.path,
          method,
          ...query !== undefined ? { query } : {},
          ...args.body !== undefined ? { body: args.body } : {},
        }, exec.signal)
        return payload as Record<string, never>
      },
    }))
  }
}

function candidateOf(id: PluginId): SkillCandidate {
  const meta = SKILL_META[id]
  return {
    name: id,
    description: meta.description,
    invocation: INVOCATION,
    provider: PROVIDER_NAME,
    source: 'bundled',
    rank: BUNDLED_SKILL_RANK,
    locator: id,
  }
}

function definitionOf(id: PluginId, content: string): SkillDefinition {
  const candidate = candidateOf(id)
  return {
    name: candidate.name,
    description: candidate.description,
    invocation: candidate.invocation,
    provider: candidate.provider,
    source: candidate.source,
    content,
  }
}

function asStringMap(value: unknown): Record<string, string> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const result: Record<string, string> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') result[key] = entry
  }
  return result
}
