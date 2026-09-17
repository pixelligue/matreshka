/**
 * LLMTOKENAPI search through the Matreshka API so the Host never holds the gateway key.
 * @module @deepseek-ai/dsh-web-search-matreshka/llmtokenapi
 */

import { WebError } from '@deepseek-ai/dsh-web'
import type { WebSearchProvider, WebSearchRequest, WebSearchResult, WebSearchSource } from '@deepseek-ai/dsh-web'

/** Stable id this provider registers under. */
export const LLMTOKENAPI_PROVIDER_ID = 'llmtokenapi'

/** Options for {@link LlmTokenApiSearchProvider}. */
export interface LlmTokenApiSearchProviderOptions {
  /** Matreshka API origin, no trailing slash. */
  apiOrigin: string
  /** Current Matreshka session token; empty means unavailable. */
  sessionToken: string
}

interface ProxySource {
  readonly url?: string
  readonly title?: string
  readonly snippet?: string
  readonly publishedAt?: string
}

interface ProxyResponse {
  readonly sources?: readonly ProxySource[]
}

/**
 * Map a Matreshka search-proxy source to the seam.
 * @param source - one `sources[]` entry from `POST /v1/web/search`.
 * @returns a seam source, or undefined without a URL.
 */
export function mapProxySource(source: ProxySource): WebSearchSource | undefined {
  if (source.url === undefined || source.url.length === 0) return undefined
  return {
    url: source.url,
    ...source.title !== undefined && source.title.length > 0 ? { title: source.title } : {},
    ...source.snippet !== undefined && source.snippet.length > 0 ? { snippet: source.snippet } : {},
    ...source.publishedAt !== undefined && source.publishedAt.length > 0
      ? { publishedAt: source.publishedAt }
      : {},
  }
}

/** LLMTOKENAPI search via the product API; HTTP redirects fail as `WEB_PROVIDER_ERROR`. */
export class LlmTokenApiSearchProvider implements WebSearchProvider {
  readonly id = LLMTOKENAPI_PROVIDER_ID

  constructor(private readonly resolveOptions: () => LlmTokenApiSearchProviderOptions) {}

  available(): boolean {
    const options = this.resolveOptions()
    return options.sessionToken.length > 0 && URL.canParse(options.apiOrigin)
  }

  async search(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult> {
    const options = this.resolveOptions()
    if (options.sessionToken.length === 0) {
      throw new WebError('Matreshka session is required for LLMTOKENAPI search', 'WEB_PROVIDER_ERROR')
    }
    const url = `${options.apiOrigin.replace(/\/$/, '')}/v1/web/search`
    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        redirect: 'error',
        headers: {
          'authorization': `Bearer ${options.sessionToken}`,
          'content-type': 'application/json',
          'accept': 'application/json',
        },
        body: JSON.stringify({
          query: request.query,
          provider: 'llmtokenapi',
          ...request.maxResults !== undefined ? { maxResults: request.maxResults } : {},
        }),
        ...signal !== undefined ? { signal } : {},
      })
    } catch (error: unknown) {
      if (isAbortError(error)) throw new WebError('LLMTOKENAPI search aborted', 'WEB_ABORTED', { cause: error })
      throw new WebError(`LLMTOKENAPI search request failed: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
    }
    if (!response.ok) {
      throw new WebError(`Matreshka search API error (HTTP ${response.status})`, 'WEB_PROVIDER_ERROR')
    }
    try {
      const payload = await response.json() as ProxyResponse
      const sources = (payload.sources ?? [])
        .map(mapProxySource)
        .filter((source): source is WebSearchSource => source !== undefined)
      return { sources, truncated: false }
    } catch (error: unknown) {
      if (isAbortError(error)) throw new WebError('LLMTOKENAPI search aborted', 'WEB_ABORTED', { cause: error })
      throw new WebError(`Matreshka search API returned an unprocessable body: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
    }
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
