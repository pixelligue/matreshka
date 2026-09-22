/** Session-scoped audio URL cache. A seeded local file plays without a Host read. */
import type { Context } from '@deepseek-ai/cordis'
import type { FileAttachmentRef } from '@deepseek-ai/dsh-attachment'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { bytesToBase64 } from '@deepseek-ai/dsh-util-crypto'

interface AudioUrlEntry {
  readonly sessionId: SessionId
  readonly generation: number
  current?: string
  pending: Promise<string>
}

/** Resolve durable Conversation audio and release browser URLs with Session scope. */
export class HistoricalAudioCache {
  private readonly entries = new Map<string, AudioUrlEntry>()
  private readonly generations = new Map<SessionId, number>()
  private readonly scopeDisposers = new Map<SessionId, () => void>()
  private readonly urls = new Set<string>()
  private disposed = false

  /**
   * @param ctx - Owning ui-conversation fiber.
   * @param sessions - Session Controller object layer.
   */
  constructor(ctx: Context, private readonly sessions: ISessions) {
    ctx.effect(() => () => { this.dispose() }, 'ui-conversation historical audio cache')
  }

  /**
   * Resolve one session audio URL, reusing a seeded local file when present.
   * @param sessionId - Session authorization and lifetime scope.
   * @param attachment - Durable file reference.
   * @returns browser URL valid until the Session binding is released.
   */
  resolve(sessionId: SessionId, attachment: FileAttachmentRef): Promise<string> {
    if (this.disposed) return Promise.reject(new Error('ui-conversation audio cache is disposed'))
    const key = this.key(sessionId, attachment)
    const cached = this.entries.get(key)
    if (cached !== undefined) return cached.pending
    const binding = this.sessions.binding(sessionId)
    if (binding === undefined) {
      return Promise.reject(new Error(`ui-conversation: unknown session "${sessionId}"`))
    }
    this.bindScope(sessionId, binding.ctx)
    const entry: AudioUrlEntry = {
      sessionId,
      generation: this.generations.get(sessionId) ?? 0,
      pending: Promise.resolve(''),
    }
    this.entries.set(key, entry)
    entry.pending = this.load(key, entry, attachment)
    return entry.pending
  }

  /**
   * Keep a local object URL for one uploaded file so the sent message can play
   * before and without a Host read. A later resolve reuses it.
   * @param sessionId - Session authorization and lifetime scope.
   * @param attachment - Durable file reference from the completed upload.
   * @param url - browser URL to adopt.
   * @returns whether the cache took ownership.
   */
  seed(sessionId: SessionId, attachment: FileAttachmentRef, url: string): boolean {
    if (this.disposed) return false
    const key = this.key(sessionId, attachment)
    if (this.entries.has(key)) return false
    const binding = this.sessions.binding(sessionId)
    if (binding === undefined) return false
    this.bindScope(sessionId, binding.ctx)
    this.urls.add(url)
    this.entries.set(key, {
      sessionId,
      generation: this.generations.get(sessionId) ?? 0,
      current: url,
      pending: Promise.resolve(url),
    })
    return true
  }

  private key(sessionId: SessionId, attachment: FileAttachmentRef): string {
    return `${sessionId}:${attachment.attachmentId}`
  }

  private load(key: string, entry: AudioUrlEntry, attachment: FileAttachmentRef): Promise<string> {
    const binding = this.sessions.binding(entry.sessionId)
    if (binding === undefined) return Promise.reject(new Error(`ui-conversation: unknown session "${entry.sessionId}"`))
    return binding.session.readFileAudio(attachment.attachmentId)
      .then((result) => {
        if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
        this.assertLive(key, entry)
        const bytes = Uint8Array.from(result.value.data)
        const url = typeof URL.createObjectURL === 'function'
          ? URL.createObjectURL(new Blob([bytes], { type: result.value.mediaType }))
          : `data:${result.value.mediaType};base64,${bytesToBase64(bytes)}`
        this.assertLive(key, entry)
        this.urls.add(url)
        entry.current = url
        return url
      })
      .catch((error: unknown) => {
        if (this.entries.get(key) === entry && entry.current === undefined) this.entries.delete(key)
        throw error
      })
  }

  private assertLive(key: string, entry: AudioUrlEntry): void {
    if (this.disposed) throw new Error('ui-conversation audio cache was disposed before loading completed')
    if (this.entries.get(key) !== entry
      || (this.generations.get(entry.sessionId) ?? 0) !== entry.generation) {
      throw new Error('ui-conversation audio scope was released before loading completed')
    }
  }

  private bindScope(sessionId: SessionId, scope: Context): void {
    if (this.scopeDisposers.has(sessionId)) return
    const dispose = scope.effect(() => () => {
      this.scopeDisposers.delete(sessionId)
      this.release(sessionId)
    }, 'ui-conversation historical audio scope')
    this.scopeDisposers.set(sessionId, () => { void dispose() })
  }

  private release(sessionId: SessionId): void {
    this.generations.set(sessionId, (this.generations.get(sessionId) ?? 0) + 1)
    for (const [key, entry] of this.entries) {
      if (entry.sessionId !== sessionId) continue
      this.entries.delete(key)
      if (entry.current !== undefined) this.releaseUrl(entry.current)
    }
  }

  private releaseUrl(url: string): void {
    if (!this.urls.delete(url)) return
    if (url.startsWith('blob:') && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url)
  }

  private dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const dispose of [...this.scopeDisposers.values()]) dispose()
    this.scopeDisposers.clear()
    for (const url of this.urls) {
      if (url.startsWith('blob:') && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url)
    }
    this.urls.clear()
    this.entries.clear()
  }
}
