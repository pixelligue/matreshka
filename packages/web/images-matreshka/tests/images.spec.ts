import { afterEach, describe, expect, it, vi } from 'vitest'
import { postGenerateImages } from '../src/client.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('postGenerateImages', () => {
  it('posts prompt and n with the session bearer', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({
      model: 'gpt-image-2',
      images: [{ b64: 'aaa', mediaType: 'image/png' }],
    }))
    vi.stubGlobal('fetch', fetchMock)
    const result = await postGenerateImages(
      { apiOrigin: 'http://127.0.0.1:8016', sessionToken: 'sess-1' },
      { prompt: 'a lamp', n: 3 },
    )
    expect(result.model).toBe('gpt-image-2')
    expect(result.images).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledOnce()
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('http://127.0.0.1:8016/v1/images/generate')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer sess-1')
    expect(JSON.parse(String(init.body))).toEqual({ prompt: 'a lamp', n: 3 })
  })

  it('sends references for edits', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({
      model: 'gpt-image-2',
      images: [{ b64: 'bbb', mediaType: 'image/png' }],
    }))
    vi.stubGlobal('fetch', fetchMock)
    await postGenerateImages(
      { apiOrigin: 'http://127.0.0.1:8016/', sessionToken: 'sess-1' },
      { prompt: 'make blue', references: [{ b64: 'ccc', mediaType: 'image/png' }] },
    )
    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body)) as {
      references: unknown
    }
    expect(body.references).toEqual([{ b64: 'ccc', mediaType: 'image/png' }])
  })

  it('fails closed without a session', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(postGenerateImages(
      { apiOrigin: 'http://127.0.0.1:8016', sessionToken: '' },
      { prompt: 'x' },
    )).rejects.toThrow(/session/)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
