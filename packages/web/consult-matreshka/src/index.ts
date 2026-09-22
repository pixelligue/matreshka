/**
 * Host tools that consult Flash and pick tools through Jev via the Matreshka API.
 * @module @deepseek-ai/dsh-consult-matreshka
 */

import type { Context } from '@deepseek-ai/cordis'
import type { PreStepDecision } from '@deepseek-ai/dsh-agent'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import z from '@deepseek-ai/schemastery'
import {
  DEFAULT_MATRESHKA_API_ORIGIN,
} from './client.ts'
import { consultGatePreStep } from './gate.ts'

export {
  DEFAULT_MATRESHKA_API_ORIGIN,
  postConsult,
  postSelectTool,
  postSkillPlan,
} from './client.ts'
export {
  CONSULT_GATE_CANDIDATES,
  CONSULT_GATE_INSTRUCTION,
  consultGateGoal,
  consultGatePreStep,
  userAuthoredText,
} from './gate.ts'
export type {
  ConsultInput,
  ConsultResult,
  MatreshkaSessionOptions,
  SelectToolInput,
  SelectToolResult,
  SkillPlanInput,
  SkillPlanResult,
  SkillPlanSkill,
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
 * Run Jev and, when a stack skill matches, install that skill before the model speaks.
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

  ctx.on('agent/pre-step', async ({ messages, step, signal }, next): Promise<PreStepDecision> => {
    return await consultGatePreStep({ messages, step, signal }, next, options)
  })
}
