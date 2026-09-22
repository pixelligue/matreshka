/** session/audio returns only a log-referenced playable file within the byte cap. */

import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { FileAttachmentRef } from '@deepseek-ai/dsh-attachment'
import SessionStore from '@deepseek-ai/dsh-session'
import type { SessionId } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import { MAX_PLAYABLE_AUDIO_BYTES, playableAudioMediaType } from '../src/playable-audio.ts'
import { createSessionTestRemote } from './test-remote.ts'

async function harness(): Promise<{ ctx: Context; agent: Agent; sessionId: SessionId }> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(SystemPrompt, { personaPrefix: '' })
  await ctx.plugin(AgentRegistry)
  const session = ctx.sessions.create()
  const agent = {
    id: session.id,
    session,
    status: 'running',
    ctx,
    inbox: { nextTurn: [], nextStep: [] },
  } as unknown as Agent
  await ctx.agents.register(agent)
  return { ctx, agent, sessionId: session.id }
}

function file(name: string, bytes: number, id = 'aa'): FileAttachmentRef {
  return {
    attachmentId: `sha256:${id.padEnd(64, 'a')}` as never,
    name,
    bytes,
  }
}

function quote(agent: Agent, ref: FileAttachmentRef): void {
  agent.session.append('agent/inbox/spliced', {
    target: 'next-turn',
    start: 0,
    inserted: [{
      id: 'queued-audio',
      role: 'user',
      source: { kind: 'user' },
      content: [{ type: 'file', attachment: ref }],
    }],
  } as never)
}

describe('session/audio', () => {
  it('names the playable extensions', () => {
    expect(playableAudioMediaType('note.mp3')).toBe('audio/mpeg')
    expect(playableAudioMediaType('note.wav')).toBe('audio/wav')
    expect(playableAudioMediaType('note.ogg')).toBe('audio/ogg')
    expect(playableAudioMediaType('note.oga')).toBe('audio/ogg')
    expect(playableAudioMediaType('note.m4a')).toBe('audio/mp4')
    expect(playableAudioMediaType('note.aac')).toBe('audio/aac')
    expect(playableAudioMediaType('note.webm')).toBe('audio/webm')
    expect(playableAudioMediaType('notes.txt')).toBeUndefined()
  })

  it('returns referenced audio and refuses other files', async () => {
    const { ctx, agent, sessionId } = await harness()
    const mp3 = file('note.mp3', 3)
    const readFileStream = vi.fn(async function* () {
      yield Uint8Array.of(1, 2, 3)
    })
    ctx.provide('attachments', { readFileStream } as never)
    const remote = createSessionTestRemote(ctx, {
      defaultModelSelection: () => ({ provider: 'matreshka', model: 'matrena' }),
      cwd: '/tmp',
    })
    quote(agent, mp3)

    const allowed = await remote.audio({ sessionId, attachmentId: mp3.attachmentId })
    expect(allowed).toMatchObject({
      ok: true,
      value: { attachment: mp3, mediaType: 'audio/mpeg', data: 'AQID' },
    })
    expect(readFileStream).toHaveBeenCalledOnce()

    const missing = await remote.audio({ sessionId, attachmentId: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as never })
    expect(missing).toMatchObject({
      ok: false,
      error: { code: 'session/attachment-invalid', details: { reason: 'ATTACHMENT_NOT_REFERENCED' } },
    })

    const textFile = file('notes.txt', 3, 'bb')
    quote(agent, textFile)
    const text = await remote.audio({ sessionId, attachmentId: textFile.attachmentId })
    expect(text).toMatchObject({
      ok: false,
      error: { code: 'session/attachment-invalid', details: { reason: 'NOT_PLAYABLE_AUDIO' } },
    })
    await ctx.fiber.dispose()
  })

  it('refuses audio above 32 MiB before reading bytes', async () => {
    const { ctx, agent, sessionId } = await harness()
    const huge = file('long.wav', MAX_PLAYABLE_AUDIO_BYTES + 1)
    const readFileStream = vi.fn(async function* () {
      yield Uint8Array.of(1)
    })
    ctx.provide('attachments', { readFileStream } as never)
    const remote = createSessionTestRemote(ctx, {
      defaultModelSelection: () => ({ provider: 'matreshka', model: 'matrena' }),
      cwd: '/tmp',
    })
    quote(agent, huge)
    const denied = await remote.audio({ sessionId, attachmentId: huge.attachmentId })
    expect(denied).toMatchObject({
      ok: false,
      error: { code: 'session/attachment-invalid', details: { reason: 'AUDIO_TOO_LARGE' } },
    })
    expect(readFileStream).not.toHaveBeenCalled()
    await ctx.fiber.dispose()
  })
})
