/**
 * Host tool that transcribes an attached recording through the Matreshka API.
 * @module @deepseek-ai/dsh-audio-matreshka
 */

import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { FsError } from '@deepseek-ai/dsh-fs'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { DEFAULT_MATRESHKA_API_ORIGIN, postTranscription, transcribeFormat } from './client.ts'

export { DEFAULT_MATRESHKA_API_ORIGIN, postTranscription, transcribeFormat } from './client.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'audio-matreshka'

/** Services required to read a saved recording and register the tool. */
export const inject = ['tools', 'fs']

/** Inclusive byte cap sent to the transcription API. */
export const MAX_TRANSCRIBE_BYTES = 25 * 1024 * 1024

/** Plugin config. */
export interface Config {
  apiOrigin?: string
}

/** Validated plugin config. */
export const Config: z<Config> = z.object({
  apiOrigin: z.string().default(DEFAULT_MATRESHKA_API_ORIGIN),
})

const SESSION_TOKEN = credentialRef('MATRESHKA_SESSION_TOKEN')

/**
 * Register `transcribe_audio`.
 * @param ctx - plugin context.
 * @param config - optional API origin.
 */
export function apply(ctx: Context, config: Config = {}): void {
  const apiOrigin = Config(config).apiOrigin ?? DEFAULT_MATRESHKA_API_ORIGIN
  const session = {
    token: launchEnvironmentOf(ctx).get('MATRESHKA_SESSION_TOKEN')?.value ?? '',
  }
  ctx.inject(['credentials'], (credentialsCtx) => {
    const refresh = (): void => {
      void credentialsCtx.credentials.resolve(SESSION_TOKEN).then((hit) => {
        if (hit !== undefined && hit.value.length > 0) session.token = hit.value
      })
    }
    refresh()
  })

  ctx.tools.register(defineTool({
    name: 'transcribe_audio',
    description:
        'Transcribe a playable audio file (mp3, wav, ogg, oga, m4a, aac, webm) into text with Deepgram Nova-3. '
        + 'Pass the saved read-only path from the file handle. Do not use the read tool on audio. '
        + 'The operator can already play the file in the chat. Use the returned transcript as the contents.',
    parameters: {
      path: { type: 'string', required: true, description: 'Saved read-only path of the audio file.' },
      language: { type: 'string', description: 'Optional ISO-639-1 hint such as ru or en. Omit to auto-detect.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          text: { type: 'string', required: true },
          model: { type: 'string', required: true },
          seconds: { type: 'number' },
        },
      },
      render: (_args, value): ContentBlock[] => [{
        type: 'text',
        text: value.text,
      }],
    },
    presentCall() {
      return { card: 'generic' as const, title: 'Transcribing audio', kind: 'other' as const }
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const path = args.path.trim()
      if (path.length === 0) throw new Error('path must be a non-empty string')
      const format = transcribeFormat(path)
      if (format === undefined) {
        throw new Error(`cannot transcribe "${path}": expected mp3, wav, ogg, m4a, aac, or webm`)
      }
      const target = await ctx.fs.resolve(path, { signal: exec.signal })
      const info = await ctx.fs.stat(target, exec.signal)
      if (info === undefined) throw new Error(`cannot transcribe "${path}": not found`)
      if (info.type !== 'file') throw new Error(`cannot transcribe "${path}": not a regular file`)
      if (info.size !== undefined && info.size > MAX_TRANSCRIBE_BYTES) {
        throw new Error(`cannot transcribe "${path}": file exceeds 25 MiB`)
      }
      let data: Uint8Array
      try {
        data = await ctx.fs.readBytes(target, exec.signal, MAX_TRANSCRIBE_BYTES)
      } catch (error: unknown) {
        if (error instanceof FsError) throw new Error(`cannot transcribe "${path}": ${error.message}`, { cause: error })
        throw error
      }
      const result = await postTranscription({
        apiOrigin,
        sessionToken: session.token,
      }, {
        data,
        format,
        ...typeof args.language === 'string' ? { language: args.language } : {},
      }, exec.signal)
      return {
        text: result.text,
        model: result.model,
        ...result.seconds !== undefined ? { seconds: result.seconds } : {},
      }
    },
  }))
}
