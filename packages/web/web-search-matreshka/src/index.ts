/**
 * Matreshka search backends for `ctx.web`: Keenable (keyless) and LLMTOKENAPI
 * (session-token proxy to the product API).
 * @module @deepseek-ai/dsh-web-search-matreshka
 */

import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import {
  KeenableSearchProvider,
  KEENABLE_PUBLIC_SEARCH_URL,
  KEENABLE_TITLE,
} from './keenable.ts'
import {
  KeenableFetchProvider,
  KEENABLE_PUBLIC_FETCH_URL,
} from './keenable-fetch.ts'
import { LlmTokenApiSearchProvider } from './llmtokenapi.ts'

export {
  KEENABLE_PROVIDER_ID,
  KEENABLE_PUBLIC_SEARCH_URL,
  KEENABLE_TITLE,
  KeenableSearchProvider,
  mapKeenableResponse,
  mapKeenableResult,
} from './keenable.ts'
export {
  LLMTOKENAPI_PROVIDER_ID,
  LlmTokenApiSearchProvider,
  mapProxySource,
} from './llmtokenapi.ts'
export {
  KEENABLE_FETCH_PROVIDER_ID,
  KEENABLE_PUBLIC_FETCH_URL,
  KeenableFetchProvider,
  mapKeenableFetch,
} from './keenable-fetch.ts'
export type { KeenableSearchProviderOptions } from './keenable.ts'
export type { LlmTokenApiSearchProviderOptions } from './llmtokenapi.ts'

/** Default Matreshka API origin (same as Host apiOrigin). */
export const DEFAULT_MATRESHKA_API_ORIGIN = 'http://127.0.0.1:8016'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'web-search-matreshka'

/** The web seam this provider registers into. */
export const inject = ['web']

/** Plugin config. */
export interface Config {
  /** Matreshka API origin used by the LLMTOKENAPI search proxy. */
  apiOrigin?: string
  /** Override Keenable public search URL (tests). */
  keenableSearchUrl?: string
  /** `X-Keenable-Title` value. */
  keenableTitle?: string
}

export const Config: z<Config> = z.object({
  apiOrigin: z.string().default(DEFAULT_MATRESHKA_API_ORIGIN),
  keenableSearchUrl: z.string().default(KEENABLE_PUBLIC_SEARCH_URL),
  keenableTitle: z.string().default(KEENABLE_TITLE),
})

const SESSION_TOKEN = credentialRef('MATRESHKA_SESSION_TOKEN')

/**
 * Register Keenable and LLMTOKENAPI search providers with `ctx.web`.
 * @param ctx - plugin context.
 * @param config - optional origin and Keenable URL overrides.
 */
export function apply(ctx: Context, config: Config = {}): void {
  const apiOrigin = config.apiOrigin ?? DEFAULT_MATRESHKA_API_ORIGIN
  const title = config.keenableTitle ?? KEENABLE_TITLE
  ctx.web.registerSearchProvider(new KeenableSearchProvider({
    searchUrl: config.keenableSearchUrl ?? KEENABLE_PUBLIC_SEARCH_URL,
    title,
  }))
  ctx.web.registerFetchProvider(new KeenableFetchProvider({
    fetchUrl: KEENABLE_PUBLIC_FETCH_URL,
    title,
  }))
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
  ctx.web.registerSearchProvider(new LlmTokenApiSearchProvider(() => ({
    apiOrigin,
    sessionToken: session.token,
  })))
}
