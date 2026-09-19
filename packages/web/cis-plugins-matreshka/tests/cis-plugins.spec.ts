import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import * as CisPlugins from '../src/index.ts'
import { callPlugin, listEnabledPlugins } from '../src/client.ts'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('listEnabledPlugins', () => {
  it('returns no skills without a session token and does not fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(listEnabledPlugins({
      apiOrigin: 'http://127.0.0.1:8016',
      sessionToken: '',
    })).resolves.toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns only enabled plugin ids and never documents', async () => {
    const fetchMock = vi.fn(async () => jsonResponse([
      { id: 'amocrm', enabled: true, connected: true },
      { id: 'bitrix24', enabled: false, connected: true },
      { id: 'tilda', enabled: true, connected: false },
      { id: 'hotels', enabled: false, connected: false },
      { id: 'documents', enabled: true, connected: true },
    ]))
    vi.stubGlobal('fetch', fetchMock)
    await expect(listEnabledPlugins({
      apiOrigin: 'http://127.0.0.1:8016/',
      sessionToken: 'sess-1',
    })).resolves.toEqual(['amocrm', 'tilda'])
    expect(fetchMock.mock.calls[0]![0]).toBe('http://127.0.0.1:8016/v1/plugins')
  })
})

describe('callPlugin', () => {
  it('fails closed without a session and does not fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(callPlugin(
      { apiOrigin: 'http://127.0.0.1:8016', sessionToken: '' },
      'amocrm',
      { path: 'leads' },
    )).rejects.toThrow('Matreshka session is required for plugin calls')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('maps HTTP 409 to a connection-required error', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ detail: 'Plugin is not connected' }, 409))
    vi.stubGlobal('fetch', fetchMock)
    await expect(callPlugin(
      { apiOrigin: 'http://127.0.0.1:8016', sessionToken: 'sess-1' },
      'amocrm',
      { path: 'leads' },
    )).rejects.toThrow('disabled or not connected')
  })
})

describe('cis-plugins-matreshka apply', () => {
  it('loads enabled skills into a new session and drops a disabled skill on the next list', async () => {
    vi.stubEnv('MATRESHKA_SESSION_TOKEN', 'sess-1')
    let enabled = new Set(['amocrm', 'tilda'])
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).endsWith('/v1/plugins')) {
        return jsonResponse(['amocrm', 'bitrix24', 'tilda', 'hotels'].map(id => ({
          id,
          enabled: enabled.has(id),
          connected: id === 'amocrm',
        })))
      }
      return jsonResponse({ _embedded: { leads: [] } })
    }))
    const ctx = new Context()
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(SkillRegistry)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(CisPlugins)
    const first = (await ctx.skills.list()).map(skill => skill.name).sort()
    expect(first).toEqual(['amocrm', 'tilda'])
    expect(first).not.toContain('documents')
    expect(first).not.toContain('word')
    expect(first).not.toContain('excel')
    expect(first).not.toContain('pdf')
    const loaded = await ctx.skills.get('amocrm')
    expect(loaded?.content).toContain('amocrm')
    enabled = new Set(['amocrm'])
    const second = (await ctx.skills.list()).map(skill => skill.name).sort()
    expect(second).toEqual(['amocrm'])
    expect(second).not.toContain('tilda')
  })

  it('fails an amoCRM tool closed when the API returns 409', async () => {
    vi.stubEnv('MATRESHKA_SESSION_TOKEN', 'sess-1')
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ detail: 'Plugin is not connected' }, 409)))
    const ctx = new Context()
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(SkillRegistry)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(CisPlugins)
    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('call-1'),
      name: 'amocrm',
      arguments: { path: 'leads' },
    })
    expect(result.isError).toBe(true)
    expect(JSON.stringify(result)).toContain('disabled or not connected')
  })
})
