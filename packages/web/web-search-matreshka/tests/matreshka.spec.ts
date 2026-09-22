import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import WebRuntime from '@deepseek-ai/dsh-web'
import {
  KeenableFetchProvider,
  KeenableSearchProvider,
  KEENABLE_PROVIDER_ID,
  KEENABLE_PUBLIC_FETCH_URL,
  KEENABLE_TITLE,
  LlmTokenApiSearchProvider,
  apply,
  inject,
  mapKeenableFetch,
  mapKeenableResult,
  mapProxySource,
} from '../src/index.ts'

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Keenable mapping', () => {
  it('maps title snippet and published_at', () => {
    expect(mapKeenableResult({
      url: 'https://a.test',
      title: 'A',
      snippet: 'hello',
      published_at: '2026-01-01T00:00:00Z',
    })).toEqual({
      url: 'https://a.test',
      title: 'A',
      snippet: 'hello',
      publishedAt: '2026-01-01T00:00:00Z',
    })
  })

  it('drops entries without a url', () => {
    expect(mapKeenableResult({ title: 'A' })).toBeUndefined()
  })
})

describe('KeenableSearchProvider', () => {
  it('is available without an API key', () => {
    expect(new KeenableSearchProvider({
      searchUrl: 'https://api.keenable.ai/v1/search/public',
      title: KEENABLE_TITLE,
    }).available()).toBe(true)
  })

  it('sends X-Keenable-Title and no Authorization', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({
      results: [{ url: 'https://a.test', title: 'A', snippet: 's' }],
    }))
    vi.stubGlobal('fetch', fetchMock)
    const provider = new KeenableSearchProvider({
      searchUrl: 'https://keenable.test/v1/search/public',
      title: KEENABLE_TITLE,
    })
    const result = await provider.search({ query: 'typescript' })
    expect(result.sources[0]?.url).toBe('https://a.test')
    expect(fetchMock).toHaveBeenCalledOnce()
    const init = fetchMock.mock.calls[0]![1] as RequestInit
    const headers = new Headers(init.headers)
    expect(headers.get('x-keenable-title')).toBe(KEENABLE_TITLE)
    expect(headers.get('authorization')).toBeNull()
    expect(init.redirect).toBe('error')
  })
})

describe('LlmTokenApiSearchProvider', () => {
  it('is unavailable without a session token', () => {
    const provider = new LlmTokenApiSearchProvider(() => ({
      apiOrigin: 'http://127.0.0.1:8016',
      sessionToken: '',
    }))
    expect(provider.available()).toBe(false)
  })

  it('does not call the Matreshka API without a session', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const provider = new LlmTokenApiSearchProvider(() => ({
      apiOrigin: 'http://127.0.0.1:8016',
      sessionToken: '',
    }))
    await expect(provider.search({ query: 'q' })).rejects.toThrow(/session/u)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts provider llmtokenapi with the session bearer', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({
      sources: [{ url: 'https://b.test', title: 'B', snippet: 'rag' }],
    }))
    vi.stubGlobal('fetch', fetchMock)
    const provider = new LlmTokenApiSearchProvider(() => ({
      apiOrigin: 'http://127.0.0.1:8016',
      sessionToken: 'sess-1',
    }))
    expect(provider.available()).toBe(true)
    const result = await provider.search({ query: 'rag' })
    expect(result.sources[0]?.url).toBe('https://b.test')
    expect(mapProxySource({ url: 'https://b.test' })?.url).toBe('https://b.test')
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('http://127.0.0.1:8016/v1/web/search')
    const headers = new Headers((init as RequestInit).headers)
    expect(headers.get('authorization')).toBe('Bearer sess-1')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      query: 'rag',
      provider: 'llmtokenapi',
    })
    expect((init as RequestInit).redirect).toBe('error')
  })
})

describe('KeenableFetchProvider', () => {
  it('maps markdown content to a text body', () => {
    expect(mapKeenableFetch(200, 'https://example.com', {
      url: 'https://example.com/final',
      content: '# Hello',
    })).toEqual({
      url: 'https://example.com/final',
      statusCode: 200,
      body: { kind: 'text', content: '# Hello' },
      truncated: false,
    })
  })

  it('sends X-Keenable-Title and no Authorization', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({ content: 'page' }))
    vi.stubGlobal('fetch', fetchMock)
    const provider = new KeenableFetchProvider({
      fetchUrl: KEENABLE_PUBLIC_FETCH_URL,
      title: KEENABLE_TITLE,
    })
    const result = await provider.fetch({ url: 'https://example.com/doc' })
    expect(result.body).toEqual({ kind: 'text', content: 'page' })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(String(url)).toContain('url=https%3A%2F%2Fexample.com%2Fdoc')
    expect(String(url)).toContain('live=true')
    const headers = new Headers((init as RequestInit).headers)
    expect(headers.get('x-keenable-title')).toBe(KEENABLE_TITLE)
    expect(headers.get('authorization')).toBeNull()
    expect((init as RequestInit).redirect).toBe('error')
  })
})

describe('plugin registration', () => {
  it('registers keenable as the usable default without a session', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const ctx = new Context()
    await ctx.plugin(WebRuntime, { searchProvider: KEENABLE_PROVIDER_ID, fetchProvider: KEENABLE_PROVIDER_ID })
    const fiber = await ctx.plugin({ inject: [...inject], apply })
    await expect(ctx.web.search({ query: 'q' })).resolves.toMatchObject({ sources: [] })
    expect(fetchMock).toHaveBeenCalled()
    const headers = new Headers((fetchMock.mock.calls[0]![1] as RequestInit).headers)
    expect(headers.get('authorization')).toBeNull()
    await fiber.dispose()
  })
})
