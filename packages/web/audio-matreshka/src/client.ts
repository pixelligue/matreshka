/**
 * Session-bearer post to the Matreshka transcription API.
 * @module @deepseek-ai/dsh-audio-matreshka/client
 */

/** Default Matreshka API origin. */
export const DEFAULT_MATRESHKA_API_ORIGIN = 'http://127.0.0.1:8016'

/** Playable formats the transcription API accepts. */
export const TRANSCRIBE_FORMATS = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'webm'] as const

/** One transcription request format. */
export type TranscribeFormat = (typeof TRANSCRIBE_FORMATS)[number]

/** Options shared by transcription posts. */
export interface MatreshkaSessionOptions {
  apiOrigin: string
  sessionToken: string
}

/** Body for {@link postTranscription}. */
export interface TranscribeInput {
  readonly data: Uint8Array
  readonly format: TranscribeFormat
  readonly language?: string
}

/** JSON from `POST /v1/audio/transcriptions`. */
export interface TranscribeResult {
  readonly text: string
  readonly model: string
  readonly seconds?: number
}

/**
 * Format named by a file path, or undefined when the extension is not playable audio.
 * @param path - file path or name.
 * @returns the API format.
 */
export function transcribeFormat(path: string): TranscribeFormat | undefined {
  const leaf = path.slice(Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1)
  const dot = leaf.lastIndexOf('.')
  const extension = dot <= 0 ? '' : leaf.slice(dot + 1).toLowerCase()
  if (extension === 'oga') return 'ogg'
  return (TRANSCRIBE_FORMATS as readonly string[]).includes(extension) ? extension as TranscribeFormat : undefined
}

/**
 * POST `/v1/audio/transcriptions` with the session bearer.
 * @param options - API origin and session token.
 * @param input - audio bytes and format.
 * @param signal - optional abort signal.
 * @returns the transcript.
 */
export async function postTranscription(
  options: MatreshkaSessionOptions,
  input: TranscribeInput,
  signal?: AbortSignal,
): Promise<TranscribeResult> {
  if (options.sessionToken.length === 0) {
    throw new Error('Matreshka session is required for transcription')
  }
  const payload = await postJson(
    `${options.apiOrigin.replace(/\/$/, '')}/v1/audio/transcriptions`,
    options.sessionToken,
    {
      data: Buffer.from(input.data).toString('base64'),
      format: input.format,
      ...input.language !== undefined && input.language.trim() !== '' ? { language: input.language.trim() } : {},
    },
    signal,
  )
  if (typeof payload.text !== 'string' || payload.text.trim() === '') {
    throw new Error('Matreshka transcription API returned no text')
  }
  return {
    text: payload.text.trim(),
    model: typeof payload.model === 'string' ? payload.model : 'deepgram/nova-3',
    ...typeof payload.seconds === 'number' ? { seconds: payload.seconds } : {},
  }
}

async function postJson(
  url: string,
  token: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      redirect: 'error',
      headers: {
        'authorization': `Bearer ${token}`,
        'content-type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(body),
      ...signal !== undefined ? { signal } : {},
    })
  } catch (error: unknown) {
    throw new Error(`Matreshka transcription request failed: ${String(error)}`, { cause: error })
  }
  if (!response.ok) {
    throw new Error(`Matreshka transcription API error (HTTP ${response.status})`)
  }
  const payload: unknown = await response.json()
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new Error('Matreshka transcription API returned an unprocessable body')
  }
  return payload as Record<string, unknown>
}
