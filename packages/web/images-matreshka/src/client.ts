/**
 * Session-bearer posts to the Matreshka image generate API.
 * @module @deepseek-ai/dsh-images-matreshka/client
 */

/** Default Matreshka API origin. */
export const DEFAULT_MATRESHKA_API_ORIGIN = 'http://127.0.0.1:8016'

/** Options shared by image posts. */
export interface MatreshkaSessionOptions {
  apiOrigin: string
  sessionToken: string
}

/** One reference image as base64. */
export interface ImageReferenceInput {
  readonly b64: string
  readonly mediaType: string
}

/** Body for {@link postGenerateImages}. */
export interface GenerateImagesInput {
  readonly prompt: string
  readonly n?: number
  readonly references?: readonly ImageReferenceInput[]
}

/** One returned raster. */
export interface GeneratedImage {
  readonly b64: string
  readonly mediaType: string
}

/** JSON from `POST /v1/images/generate`. */
export interface GenerateImagesResult {
  readonly model: string
  readonly images: readonly GeneratedImage[]
}

/**
 * POST `/v1/images/generate` with the session bearer.
 * @param options - API origin and session token.
 * @param input - prompt, optional count, optional references.
 * @param signal - optional abort signal.
 * @returns model id and rasters.
 */
export async function postGenerateImages(
  options: MatreshkaSessionOptions,
  input: GenerateImagesInput,
  signal?: AbortSignal,
): Promise<GenerateImagesResult> {
  if (options.sessionToken.length === 0) {
    throw new Error('Matreshka session is required for images')
  }
  const payload = await postJson(
    `${options.apiOrigin.replace(/\/$/, '')}/v1/images/generate`,
    options.sessionToken,
    {
      prompt: input.prompt,
      ...input.n !== undefined ? { n: input.n } : {},
      ...input.references !== undefined && input.references.length > 0
        ? { references: input.references.map(item => ({ b64: item.b64, mediaType: item.mediaType })) }
        : {},
    },
    signal,
  )
  const model = typeof payload.model === 'string' ? payload.model : 'gpt-image-2'
  const raw = payload.images
  const images: GeneratedImage[] = []
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item !== 'object' || item === null) continue
      const record = item as Record<string, unknown>
      if (typeof record.b64 !== 'string' || record.b64.length === 0) continue
      images.push({
        b64: record.b64,
        mediaType: typeof record.mediaType === 'string' ? record.mediaType : 'image/png',
      })
    }
  }
  if (images.length === 0) throw new Error('Matreshka images API returned no rasters')
  return { model, images }
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
    throw new Error(`Matreshka images request failed: ${String(error)}`, { cause: error })
  }
  if (!response.ok) {
    throw new Error(`Matreshka images API error (HTTP ${response.status})`)
  }
  const payload: unknown = await response.json()
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new Error('Matreshka images API returned an unprocessable body')
  }
  return payload as Record<string, unknown>
}
