/**
 * Keyless Keenable public search for `ctx.web`.
 * @module @deepseek-ai/dsh-web-search-matreshka/keenable
 */

import { WebError } from '@deepseek-ai/dsh-web'
import type { WebSearchProvider, WebSearchRequest, WebSearchResult, WebSearchSource } from '@deepseek-ai/dsh-web'

/** Stable id this provider registers under. */
export const KEENABLE_PROVIDER_ID = 'keenable'

/** Keenable public search URL. */
export const KEENABLE_PUBLIC_SEARCH_URL = 'https://api.keenable.ai/v1/search/public'

/** Product title sent on the public endpoint. */
export const KEENABLE_TITLE = 'Matreshka'

/** Options for {@link KeenableSearchProvider}. */
export interface KeenableSearchProviderOptions {
  /** Public search URL. */
  searchUrl: string
  /** Value of `X-Keenable-Title`. */
  title: string
}

interface KeenableResult {
  readonly url?: string
  readonly title?: string
  readonly snippet?: string
  readonly description?: string
  readonly published_at?: string
}

interface KeenableResponse {
  readonly results?: readonly KeenableResult[]
}

/**
 * Map one Keenable result to a seam source.
 * @param result - one Keenable `results[]` entry.
 * @returns a source, or undefined when `url` is missing.
 */
export function mapKeenableResult(result: KeenableResult): WebSearchSource | undefined {
  if (result.url === undefined || result.url.length === 0) return undefined
  const snippet = result.snippet ?? result.description
  return {
    url: result.url,
    ...result.title !== undefined && result.title.length > 0 ? { title: result.title } : {},
    ...snippet !== undefined && snippet.length > 0 ? { snippet } : {},
    ...result.published_at !== undefined && result.published_at.length > 0
      ? { publishedAt: result.published_at }
      : {},
  }
}

/**
 * Map a Keenable envelope to a seam result.
 * @param response - parsed public-search JSON.
 * @returns sources with no generated `content`.
 */
export function mapKeenableResponse(response: KeenableResponse): WebSearchResult {
  const sources = (response.results ?? [])
    .map(mapKeenableResult)
    .filter((source): source is WebSearchSource => source !== undefined)
  return { sources, truncated: false }
}

/** Keyless Keenable search; HTTP redirects fail as `WEB_PROVIDER_ERROR`. */
export class KeenableSearchProvider implements WebSearchProvider {
  readonly id = KEENABLE_PROVIDER_ID

  constructor(private readonly options: KeenableSearchProviderOptions) {}

  available(): boolean {
    return URL.canParse(this.options.searchUrl) && this.options.title.length > 0
  }

  async search(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult> {
    const body: Record<string, unknown> = { query: request.query }
    if (request.maxResults !== undefined) body.max_results = request.maxResults
    let response: Response
    try {
      response = await fetch(this.options.searchUrl, {
        method: 'POST',
        redirect: 'error',
        headers: {
          'content-type': 'application/json',
          'accept': 'application/json',
          'x-keenable-title': this.options.title,
        },
        body: JSON.stringify(body),
        ...signal !== undefined ? { signal } : {},
      })
    } catch (error: unknown) {
      if (isAbortError(error)) throw new WebError('Keenable search aborted', 'WEB_ABORTED', { cause: error })
      throw new WebError(`Keenable search request failed: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
    }
    if (!response.ok) {
      throw new WebError(`Keenable API error (HTTP ${response.status})`, 'WEB_PROVIDER_ERROR')
    }
    try {
      const payload = await response.json() as KeenableResponse
      return mapKeenableResponse(payload)
    } catch (error: unknown) {
      if (isAbortError(error)) throw new WebError('Keenable search aborted', 'WEB_ABORTED', { cause: error })
      throw new WebError(`Keenable returned an unprocessable response body: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
    }
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
