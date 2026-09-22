/**
 * Host tools that generate and edit images through the Matreshka API.
 * @module @deepseek-ai/dsh-images-matreshka
 */

import type { Context } from '@deepseek-ai/cordis'
import type { ImageAttachmentRef, ImageMediaType } from '@deepseek-ai/dsh-attachment'
import { AttachmentId } from '@deepseek-ai/dsh-attachment'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { DEFAULT_MATRESHKA_API_ORIGIN, postGenerateImages } from './client.ts'

export { DEFAULT_MATRESHKA_API_ORIGIN, postGenerateImages } from './client.ts'
export type { GenerateImagesInput, GenerateImagesResult, MatreshkaSessionOptions } from './client.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'images-matreshka'

/** Services required to register the tools and persist rasters. */
export const inject = ['tools', 'attachments']

/** Plugin config. */
export interface Config {
  apiOrigin?: string
}

/** Validated plugin config. */
export const Config: z<Config> = z.object({
  apiOrigin: z.string().default(DEFAULT_MATRESHKA_API_ORIGIN),
})

const SESSION_TOKEN = credentialRef('MATRESHKA_SESSION_TOKEN')
const MEDIA: readonly ImageMediaType[] = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

const IMAGE_VALUE = {
  type: 'object',
  additionalProperties: false,
  properties: {
    attachmentId: { type: 'string', required: true },
    mediaType: { type: 'string', required: true },
    bytes: { type: 'integer', required: true },
    width: { type: 'integer', required: true },
    height: { type: 'integer', required: true },
    name: { type: 'string' },
    filePath: { type: 'string' },
  },
} as const

export interface StoredImageValue {
  attachmentId: string
  mediaType: string
  bytes: number
  width: number
  height: number
  name?: string
  filePath?: string
}

function asMediaType(value: string): ImageMediaType {
  return (MEDIA as readonly string[]).includes(value) ? value as ImageMediaType : 'image/png'
}

function decodeB64(b64: string): Uint8Array {
  const clean = b64.includes(',') ? b64.slice(b64.indexOf(',') + 1) : b64
  return Uint8Array.from(Buffer.from(clean, 'base64'))
}

function refFromValue(image: StoredImageValue): ImageAttachmentRef {
  return {
    attachmentId: AttachmentId(image.attachmentId),
    mediaType: asMediaType(image.mediaType),
    bytes: image.bytes,
    width: image.width,
    height: image.height,
    ...image.name === undefined ? {} : { name: image.name },
  }
}

function renderImages(model: string, images: readonly StoredImageValue[]): ContentBlock[] {
  const blocks: ContentBlock[] = [{
    type: 'text',
    text: `Generated with ${model} (${images.length}). The pictures are already visible in the chat. Do not read or open the saved files.`,
  }]
  for (const image of images) {
    if (image.filePath !== undefined) {
      blocks.push({ type: 'text', text: `image-file:${image.attachmentId}\t${image.filePath}` })
    }
    blocks.push({ type: 'image', attachment: refFromValue(image) })
  }
  return blocks
}

/**
 * Register `generate_image` and `edit_image`.
 * @param ctx - plugin context.
 * @param config - optional API origin.
 */
export function apply(ctx: Context, config: Config = {}): void {
  const apiOrigin = Config(config).apiOrigin ?? DEFAULT_MATRESHKA_API_ORIGIN
  const session = {
    token: launchEnvironmentOf(ctx).get('MATRESHKA_SESSION_TOKEN')?.value ?? '',
  }
  const remembered = new Map<string, ImageAttachmentRef>()
  ctx.inject(['credentials'], (credentialsCtx) => {
    const refresh = (): void => {
      void credentialsCtx.credentials.resolve(SESSION_TOKEN).then((hit) => {
        if (hit !== undefined && hit.value.length > 0) session.token = hit.value
      })
    }
    refresh()
  })
  const options = (): { apiOrigin: string; sessionToken: string } => ({
    apiOrigin,
    sessionToken: session.token,
  })

  ctx.inject(['attachments'], (attCtx) => {
    const persist = async (
      rasters: readonly { b64: string; mediaType: string }[],
      stem: string,
    ): Promise<StoredImageValue[]> => {
      const store = attCtx.attachments
      const saved: StoredImageValue[] = []
      for (const [index, raster] of rasters.entries()) {
        const mediaType = asMediaType(raster.mediaType)
        const data = decodeB64(raster.b64)
        const ref = await store.saveImage({
          data,
          mediaType,
          name: `${stem}-${index + 1}.${mediaType === 'image/jpeg' ? 'jpg' : mediaType.slice(6)}`,
        })
        remembered.set(ref.attachmentId, ref)
        const filePath = store.imageHostPath(ref)
        saved.push({
          attachmentId: ref.attachmentId,
          mediaType: ref.mediaType,
          bytes: ref.bytes,
          width: ref.width,
          height: ref.height,
          ...ref.name === undefined ? {} : { name: ref.name },
          ...filePath === undefined ? {} : { filePath },
        })
      }
      return saved
    }

    attCtx.tools.register(defineTool({
      name: 'generate_image',
      description:
        'Generate pictures for the operator. The chat shows them automatically. '
        + 'Do not read, open, or verify the saved files. '
        + 'Each picture is one scene. Never draw a collage, triptych, or several panels in one image. '
        + 'Pass n>1 for separate pictures in one style, one scene each. Do not use for video.',
      parameters: {
        prompt: { type: 'string', required: true, description: 'What to draw, including style.' },
        n: { type: 'integer', description: 'How many pictures (1-10). Same style when n>1.' },
        style: { type: 'string', description: 'Shared style for a batch, if not already in the prompt.' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            model: { type: 'string', required: true },
            images: { type: 'array', required: true, items: IMAGE_VALUE },
          },
        },
        render: (_args, value) => renderImages(value.model, value.images),
      },
      presentCall(args) {
        const n = typeof args.n === 'number' && args.n > 1 ? args.n : 1
        return {
          card: 'generic' as const,
          title: n > 1 ? `Generating ${n} images` : 'Generating image',
          kind: 'other' as const,
        }
      },
      isConcurrencySafe: () => true,
      async execute(args, exec) {
        const prompt = args.style !== undefined && args.style.trim() !== ''
          ? `${args.prompt.trim()}\nStyle: ${args.style.trim()}`
          : args.prompt.trim()
        const result = await postGenerateImages(options(), {
          prompt,
          ...typeof args.n === 'number' ? { n: args.n } : {},
        }, exec.signal)
        const images = await persist(result.images, 'generated')
        return { model: result.model, images }
      },
    }))

    attCtx.tools.register(defineTool({
      name: 'edit_image',
      description:
        'Edit a picture already in this session. Pass the attachmentId from generate_image plus the change to make. '
        + 'The chat shows the result automatically. Do not read or open the saved file. '
        + 'Use for recolor, crop-in-place, add or remove objects, or restyle.',
      parameters: {
        instruction: { type: 'string', required: true, description: 'How to change the picture.' },
        attachmentId: { type: 'string', required: true, description: 'attachmentId from a previous image result.' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            model: { type: 'string', required: true },
            images: { type: 'array', required: true, items: IMAGE_VALUE },
          },
        },
        render: (_args, value) => renderImages(value.model, value.images),
      },
      presentCall() {
        return { card: 'generic' as const, title: 'Editing image', kind: 'edit' as const }
      },
      isConcurrencySafe: () => true,
      async execute(args, exec) {
        const prior = remembered.get(args.attachmentId)
        if (prior === undefined) {
          throw new Error('Unknown image attachmentId; generate_image first in this session')
        }
        const stored = await attCtx.attachments.readImage(prior, exec.signal)
        const b64 = Buffer.from(stored.data).toString('base64')
        const result = await postGenerateImages(options(), {
          prompt: args.instruction.trim(),
          references: [{ b64, mediaType: stored.ref.mediaType }],
        }, exec.signal)
        const images = await persist(result.images, 'edited')
        return { model: result.model, images }
      },
    }))
  })
}
