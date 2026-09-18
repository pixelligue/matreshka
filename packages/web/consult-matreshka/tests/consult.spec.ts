import { afterEach, describe, expect, it, vi } from 'vitest'
import { postConsult, postSelectTool } from '../src/client.ts'

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('postConsult', () => {
  it('fails without a session token and does not fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(postConsult(
      { apiOrigin: 'http://127.0.0.1:8016', sessionToken: '' },
      { goal: 'g', question: 'q' },
    )).rejects.toThrow('Matreshka session is required for consult')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts to /v1/consult with the session bearer and no OpenRouter key', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ verdict: 'ok', detail: 'go' }))
    vi.stubGlobal('fetch', fetchMock)
    const result = await postConsult(
      { apiOrigin: 'http://127.0.0.1:8016/', sessionToken: 'sess-1' },
      { goal: 'ship', question: 'safe?', plan: 'edit', evidence: 'tests' },
    )
    expect(result).toEqual({ verdict: 'ok', detail: 'go' })
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('http://127.0.0.1:8016/v1/consult')
    const headers = new Headers((init as RequestInit).headers)
    expect(headers.get('authorization')).toBe('Bearer sess-1')
    expect(headers.get('authorization')).not.toContain('sk-or-')
    const body = JSON.parse(String((init as RequestInit).body)) as Record<string, string>
    expect(body).toEqual({ goal: 'ship', question: 'safe?', plan: 'edit', evidence: 'tests' })
    expect(JSON.stringify(body)).not.toContain('OPENROUTER')
  })
})

describe('postSelectTool', () => {
  it('fails without a session token and does not fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(postSelectTool(
      { apiOrigin: 'http://127.0.0.1:8016', sessionToken: '' },
      { goal: 'edit', candidates: ['read_file'] },
    )).rejects.toThrow('Matreshka session is required for tool select')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts to /v1/tools/select with the session bearer', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ tool: 'apply_patch', confidence: 0.9 }))
    vi.stubGlobal('fetch', fetchMock)
    const result = await postSelectTool(
      { apiOrigin: 'http://127.0.0.1:8016', sessionToken: 'sess-2' },
      { goal: 'edit', candidates: ['read_file', 'apply_patch'] },
    )
    expect(result).toEqual({ tool: 'apply_patch', confidence: 0.9 })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('http://127.0.0.1:8016/v1/tools/select')
    const headers = new Headers((init as RequestInit).headers)
    expect(headers.get('authorization')).toBe('Bearer sess-2')
    expect(headers.get('authorization')).not.toContain('sk-or-')
  })
})
