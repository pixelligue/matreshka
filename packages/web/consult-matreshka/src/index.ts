/**
 * Host tools that consult Flash and pick tools through Jev via the Matreshka API.
 * @module @deepseek-ai/dsh-consult-matreshka
 */

import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  DEFAULT_MATRESHKA_API_ORIGIN,
  postConsult,
  postSelectTool,
} from './client.ts'

export {
  DEFAULT_MATRESHKA_API_ORIGIN,
  postConsult,
  postSelectTool,
} from './client.ts'
export type {
  ConsultInput,
  ConsultResult,
  MatreshkaSessionOptions,
  SelectToolInput,
  SelectToolResult,
} from './client.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'consult-matreshka'

/** Services required to register the tools and resolve the session token. */
export const inject = ['tools']

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

/**
 * Register `consult` and `select_tool`.
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

  ctx.tools.register(defineTool({
    name: 'consult',
    description:
      'Ask the cheap consultant for a short verdict on a hard coding or analysis step. '
      + 'Send only the goal, question, and relevant plan or evidence — never the full transcript. '
      + 'Skip greetings and trivial questions. Returns verdict ok, revise, or risk.',
    parameters: {
      goal: { type: 'string', required: true, description: 'What you are trying to accomplish.' },
      question: { type: 'string', required: true, description: 'The specific check to make.' },
      plan: { type: 'string', description: 'Short plan snippet, if any.' },
      evidence: { type: 'string', description: 'Diff, error, or other evidence. Keep it short.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          verdict: { type: 'string', required: true },
          detail: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: `${value.verdict}: ${value.detail}` }],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      return await postConsult(options(), {
        goal: args.goal,
        question: args.question,
        ...typeof args.plan === 'string' ? { plan: args.plan } : {},
        ...typeof args.evidence === 'string' ? { evidence: args.evidence } : {},
      }, exec.signal)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'select_tool',
    description:
      'Pick one tool name when several tools could apply. Pass the goal and the candidate names. '
      + 'Do not use this for greetings or when only one tool is obvious.',
    parameters: {
      goal: { type: 'string', required: true, description: 'What you need a tool to do.' },
      candidates: {
        type: 'array',
        required: true,
        items: { type: 'string' },
        description: 'Tool names to choose among.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          tool: { type: 'string', required: true },
          confidence: { type: 'number', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: `${value.tool} (${value.confidence})` }],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      return await postSelectTool(options(), {
        goal: args.goal,
        candidates: args.candidates,
      }, exec.signal)
    },
  }))
}
