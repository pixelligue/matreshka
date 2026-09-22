import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createUserMessage, type UserMessage } from '@deepseek-ai/dsh-llm'
import { consultGateGoal, consultGatePreStep, userAuthoredText } from '../src/gate.ts'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function user(text: string): UserMessage {
  return createUserMessage({
    content: [{ type: 'text', text }],
    source: { kind: 'user' },
  })
}

const session = { apiOrigin: 'http://127.0.0.1:8016', sessionToken: 'sess-1' }
const live = new AbortController().signal

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('userAuthoredText', () => {
  it('joins user text and ignores plugin notices', () => {
    const notice = createUserMessage({
      content: [{ type: 'text', text: '[advisor ok] go' }],
      source: {
        kind: 'plugin',
        plugin: 'consult-matreshka',
        form: 'notice',
        summary: 'advisor ok',
      },
    })
    expect(userAuthoredText([user('hello'), notice, user('fix auth')])).toBe('hello\nfix auth')
  })
})

describe('consultGatePreStep', () => {
  it('always calls next and skips Flash when Jev chooses skip', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({ tool: 'skip', confidence: 0.8 }))
    vi.stubGlobal('fetch', fetchMock)
    const next = vi.fn(async () => ({ kind: 'enter' as const, messages: [user('hi')] }))
    const decision = await consultGatePreStep(
      { messages: [user('hi')], step: 1, signal: live },
      next,
      () => session,
    )
    expect(next).toHaveBeenCalledOnce()
    expect(decision.kind).toBe('enter')
    if (decision.kind === 'enter') expect(decision.messages).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/v1/tools/select')
  })

  it('calls consult and appends an advisor notice when Jev chooses consult', async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      if (String(input).includes('/tools/select')) {
        return jsonResponse({ tool: 'consult', confidence: 0.9 })
      }
      return jsonResponse({ verdict: 'revise', detail: 'check the login path' })
    })
    vi.stubGlobal('fetch', fetchMock)
    const admitted = [user('rewrite authentication')]
    const decision = await consultGatePreStep(
      { messages: admitted, step: 1, signal: live },
      async () => ({ kind: 'enter', messages: admitted }),
      () => session,
    )
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe('http://127.0.0.1:8016/v1/skills/plan')
    expect(String(fetchMock.mock.calls[2]?.[0])).toBe('http://127.0.0.1:8016/v1/consult')
    expect(decision.kind).toBe('enter')
    if (decision.kind !== 'enter') return
    expect(decision.messages).toHaveLength(1)
    const selectBody = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body)) as { goal: string; candidates: string[] }
    expect(selectBody.goal).toContain('proceed: one clear straightforward task')
    expect(selectBody.candidates).toEqual(['skip', 'proceed', 'consult'])
    const consultBody = JSON.parse(String((fetchMock.mock.calls[2]?.[1] as RequestInit).body)) as {
      goal: string
      plan: string
    }
    expect(consultBody.goal).toBe('rewrite authentication')
    expect(consultBody.plan).toContain('without inventing facts')
  })

  it('asks Jev for a skill on proceed and stays quiet when no skill applies', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo) => {
      if (String(input).includes('/skills/plan')) return jsonResponse({ skills: [], plan: '' })
      return jsonResponse({ tool: 'proceed', confidence: 0.9 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const admitted = [user('напиши письмо клиенту что поставка задержится на два дня')]
    const decision = await consultGatePreStep(
      { messages: admitted, step: 1, signal: live },
      async () => ({ kind: 'enter', messages: admitted }),
      () => session,
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/v1/tools/select')
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/v1/skills/plan')
    expect(decision).toEqual({ kind: 'enter', messages: admitted })
  })

  it('installs the chosen skill and does not mention a consultant', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo) => {
      if (String(input).includes('/skills/plan')) {
        return jsonResponse({
          skills: [{
            id: 'fastapi-expert',
            name: 'fastapi-expert',
            body: '---\nname: fastapi-expert\ndescription: FastAPI\n---\n\nUse Pydantic.\n',
          }],
        })
      }
      return jsonResponse({ tool: 'proceed', confidence: 0.9 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const cwd = mkdtempSync(join(tmpdir(), 'skill-plan-'))
    const admitted = [user('сделай API на FastAPI')]
    const decision = await consultGatePreStep(
      { messages: admitted, step: 1, signal: live, cwd },
      async () => ({ kind: 'enter', messages: admitted }),
      () => session,
    )
    expect(decision.kind).toBe('enter')
    if (decision.kind !== 'enter') return
    const notice = decision.messages[1]
    expect(notice?.source).toMatchObject({ kind: 'skill-invocation', name: 'fastapi-expert' })
    const text = notice?.content[0]
    expect(text?.type === 'text' && text.text).toContain('Use Pydantic')
    expect(text?.type === 'text' && text.text.includes('consultant')).toBe(false)
    expect(readFileSync(join(cwd, '.dsh', 'skills', 'fastapi-expert', 'SKILL.md'), 'utf8')).toContain('Use Pydantic')
    rmSync(cwd, { recursive: true, force: true })
  })

  it('builds a Jev goal with skip, proceed, and consult', () => {
    const goal = consultGateGoal('напиши письмо')
    expect(goal).toContain('User request:\nнапиши письмо')
    expect(goal).toContain('skip:')
    expect(goal).toContain('proceed:')
    expect(goal).toContain('consult:')
  })

  it('does not fetch on later steps', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await consultGatePreStep(
      { messages: [user('continue')], step: 2, signal: live },
      async () => ({ kind: 'enter', messages: [user('continue')] }),
      () => session,
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not fetch without a session token', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await consultGatePreStep(
      { messages: [user('hard task')], step: 1, signal: live },
      async () => ({ kind: 'enter', messages: [user('hard task')] }),
      () => ({ ...session, sessionToken: '' }),
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fail-opens when Jev errors so chat still enters', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 503 })))
    const admitted = [user('hard task')]
    const decision = await consultGatePreStep(
      { messages: admitted, step: 1, signal: live },
      async () => ({ kind: 'enter', messages: admitted }),
      () => session,
    )
    expect(decision).toEqual({ kind: 'enter', messages: admitted })
  })
})
