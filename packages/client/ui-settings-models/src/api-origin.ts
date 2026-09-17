import z from '@deepseek-ai/schemastery'

/** Default origin of the Matreshka HTTP API. */
export const DEFAULT_MATRESHKA_API_ORIGIN = 'http://127.0.0.1:8016'

/** Host composition config for the Matreshka API origin. */
export interface Config {
  /** Origin of the Matreshka HTTP API, without a trailing slash. */
  apiOrigin?: string
}

/** Validated Host composition config. */
export const Config: z<Config> = z.object({
  apiOrigin: z.string().default(DEFAULT_MATRESHKA_API_ORIGIN),
})
