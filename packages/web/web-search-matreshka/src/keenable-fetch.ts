/**
 * Keyless Keenable public fetch for `ctx.web`.
 * @module @deepseek-ai/dsh-web-search-matreshka/keenable-fetch
 */

import { WebError } from '@deepseek-ai/dsh-web'
import type { WebFetchProvider, WebFetchRequest, WebFetchResult } from '@deepseek-ai/dsh-web'

/** Stable fetch-provider id. */
export const KEENABLE_FETCH_PROVIDER_ID = 'keenable'

/** Keenable public fetch URL. */
export const KEENABLE_PUBLIC_FETCH_URL = 'https://api.keenable.ai/v1/fetch/public'

/** Options for {@link KeenableFetchProvider}. */
export interface KeenableFetchProviderOptions {
  /** Public fetch URL (query `url` is appended). */
  fetchUrl: string
  /** Value of `X-Keenable-Title`. */
  title: string
}

interface KeenableFetchResponse {
  readonly url?: string
  readonly content?: string
  readonly title?: string
}

/**
 * Map a Keenable fetch envelope to the seam result.
 * @param statusCode - HTTP status of the Keenable response.
 * @param requestUrl - URL the Host asked to fetch.
 * @param payload - parsed JSON body.
 * @returns text body from Keenable markdown `content`.
 */
export function mapKeenableFetch(
  statusCode: number,
  requestUrl: string,
  payload: KeenableFetchResponse,
): WebFetchResult {
  const content = payload.content ?? ''
  return {
    url: payload.url !== undefined && payload.url.length > 0 ? payload.url : requestUrl,
    statusCode,
    body: { kind: 'text', content },
    truncated: false,
  }
}

/** Keyless Keenable fetch; HTTP redirects fail as `WEB_PROVIDER_ERROR`. */
export class KeenableFetchProvider implements WebFetchProvider {
  readonly id = KEENABLE_FETCH_PROVIDER_ID

  constructor(private readonly options: KeenableFetchProviderOptions) {}

  available(): boolean {
    return URL.canParse(this.options.fetchUrl) && this.options.title.length > 0
  }

  async fetch(request: WebFetchRequest, signal?: AbortSignal): Promise<WebFetchResult> {
    const endpoint = new URL(this.options.fetchUrl)
    endpoint.searchParams.set('url', request.url)
    endpoint.searchParams.set('live', 'true')
    let response: Response
    try {
      response = await fetch(endpoint, {
        method: 'GET',
        redirect: 'error',
        headers: {
          'accept': 'application/json',
          'x-keenable-title': this.options.title,
        },
        ...signal !== undefined ? { signal } : {},
      })
    } catch (error: unknown) {
      if (isAbortError(error)) throw new WebError('Keenable fetch aborted', 'WEB_ABORTED', { cause: error })
      throw new WebError(`Keenable fetch request failed: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
    }
    let payload: KeenableFetchResponse = {}
    try {
      payload = await response.json() as KeenableFetchResponse
    } catch (error: unknown) {
      if (isAbortError(error)) throw new WebError('Keenable fetch aborted', 'WEB_ABORTED', { cause: error })
      if (response.ok) {
        throw new WebError(`Keenable returned an unprocessable fetch body: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
      }
    }
    return mapKeenableFetch(response.status, request.url, payload)
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
