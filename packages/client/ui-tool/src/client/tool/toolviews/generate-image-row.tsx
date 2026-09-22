/** Pending and settled generate_image / edit_image rows with a picture preview. */

import { useEffect, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import type { Context } from '@deepseek-ai/cordis'
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import { IconBrowseOutline16, IconCloseOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { ToolCallViewProps } from '../../contract/slots.ts'
import { parsedToolCall } from '../models/raw-tool-call.ts'
import { toolRowModel } from '../models/tool-call-model.ts'
import { ToolRow } from '../components/ToolRow.tsx'
import { CONVERSATION_NS as NS } from '../../locale.ts'
import css from './generate-image-row.module.css'

type GenerateImageRowProps = ToolCallViewProps & PropsLocale<'conversation'>

function batchCount(block: GenerateImageRowProps['block']): number {
  const parsed = parsedToolCall(block)
  const n = parsed?.args.n
  if (typeof n === 'number' && Number.isInteger(n) && n >= 1) return Math.min(n, 10)
  return 1
}

function settledImages(block: GenerateImageRowProps['block']): ImageAttachmentRef[] {
  if (!('kind' in block) || !Array.isArray(block.content)) return []
  const refs: ImageAttachmentRef[] = []
  for (const part of block.content) {
    if (typeof part !== 'object' || part === null) continue
    const { type, attachment } = part as { type?: unknown; attachment?: unknown }
    if (type !== 'image' || typeof attachment !== 'object' || attachment === null) continue
    refs.push(attachment as ImageAttachmentRef)
  }
  return refs
}

function filePathOf(block: GenerateImageRowProps['block'], attachmentId: string): string | undefined {
  if (!('kind' in block) || !Array.isArray(block.content)) return undefined
  const prefix = `image-file:${attachmentId}\t`
  for (const part of block.content) {
    if (typeof part !== 'object' || part === null || !('text' in part)) continue
    const text = (part as { text?: unknown }).text
    if (typeof text === 'string' && text.startsWith(prefix)) return text.slice(prefix.length)
  }
  return undefined
}

function folderOf(filePath: string): string {
  const slash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
  return slash <= 0 ? filePath : filePath.slice(0, slash)
}

async function blobOf(src: string): Promise<Blob> {
  const response = await fetch(src)
  if (!response.ok) throw new Error('image fetch failed')
  return await response.blob()
}

async function copyImage(src: string): Promise<void> {
  const blob = await blobOf(src)
  await navigator.clipboard.write([new ClipboardItem({ [blob.type || 'image/png']: blob })])
}

async function downloadImage(src: string, name: string): Promise<void> {
  const blob = await blobOf(src)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

async function copyText(value: string): Promise<void> {
  await navigator.clipboard.writeText(value)
}

function GeneratedThumb({
  attachment,
  filePath,
  loadImage,
  t,
}: {
  attachment: ImageAttachmentRef
  filePath: string | undefined
  loadImage: GenerateImageRowProps['loadImage']
  t: GenerateImageRowProps['t']
}): ReactNode {
  const [src, setSrc] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const name = attachment.name ?? t('image.label')
  const folder = filePath === undefined ? undefined : folderOf(filePath)
  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const url = await loadImage(attachment)
        if (live) setSrc(url)
      } catch (error: unknown) {
        // Failed URL: the preview stays a skeleton; copy and save stay disabled.
        void error
      }
    })()
    return () => { live = false }
  }, [attachment, loadImage])
  useEffect(() => {
    if (menu === null) return
    const close = (): void => { setMenu(null) }
    window.addEventListener('mousedown', close)
    window.addEventListener('blur', close)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('blur', close)
    }
  }, [menu])
  const onContextMenu = (event: ReactMouseEvent): void => {
    event.preventDefault()
    setMenu({ x: event.clientX, y: event.clientY })
  }
  return (
    <figure className={css.card} onContextMenu={onContextMenu}>
      <button
        type="button"
        className={clsx(css.frame, src === null && css.skeleton)}
        data-testid={src === null ? 'image-skeleton' : 'image-preview'}
        aria-label={t('image.openOriginalLabel', { label: name })}
        disabled={src === null}
        onClick={() => { if (src !== null) setOpen(true) }}
      >
        {src === null ? null : <img src={src} alt={name} />}
      </button>
      <div className={css.actions}>
        <button type="button" disabled={src === null} onClick={() => { if (src !== null) void copyImage(src) }}>{t('image.copy')}</button>
        <button type="button" disabled={src === null} onClick={() => { if (src !== null) void downloadImage(src, name) }}>{t('image.download')}</button>
        {folder !== undefined && (
          <button type="button" onClick={() => { void copyText(folder) }}>{t('image.folder')}</button>
        )}
      </div>
      {folder !== undefined && <figcaption className={css.path}>{t('image.savedIn', { path: folder })}</figcaption>}
      {menu !== null && createPortal(
        <div className={css.menu} style={{ top: menu.y, left: menu.x }} role="menu" onMouseDown={(event) => { event.stopPropagation() }}>
          <button type="button" role="menuitem" disabled={src === null} onClick={() => { if (src !== null) void copyImage(src); setMenu(null) }}>{t('image.copy')}</button>
          <button type="button" role="menuitem" disabled={src === null} onClick={() => { if (src !== null) void downloadImage(src, name); setMenu(null) }}>{t('image.download')}</button>
          {folder !== undefined && (
            <button type="button" role="menuitem" onClick={() => { void copyText(folder); setMenu(null) }}>{t('image.copyPath')}</button>
          )}
        </div>,
        document.body,
      )}
      {open && src !== null && createPortal(
        <div className={css.lightbox} role="dialog" aria-modal="true" aria-label={t('image.preview')}>
          <button type="button" className={css.mask} aria-label={t('image.closePreview')} onClick={() => { setOpen(false) }} />
          <img src={src} alt={name} />
          <div className={css.lightboxActions}>
            <button type="button" onClick={() => { void copyImage(src) }}>{t('image.copy')}</button>
            <button type="button" onClick={() => { void downloadImage(src, name) }}>{t('image.download')}</button>
          </div>
          <button type="button" className={css.close} aria-label={t('image.closePreview')} onClick={() => { setOpen(false) }}>
            <IconCloseOutline16 size={16} />
          </button>
        </div>,
        document.body,
      )}
    </figure>
  )
}

/**
 * generate_image / edit_image row: skeleton frames while running, pictures when settled.
 */
export function GenerateImageRow({ toolName, block, cwd, home, openFile, inspect, loadImage, t }: GenerateImageRowProps) {
  const model = toolRowModel(toolName, block, cwd, home)
  const running = model.state === 'running'
  const count = batchCount(block)
  const images = settledImages(block)
  const pendingLabel = toolName === 'edit_image' ? t('image.editing') : t('image.generating')
  return (
    <div className={css.wrap} data-testid="generate-image-row">
      {!running && images.length === 0 && (
        <ToolRow
          t={t}
          variant={model.variant}
          toolName={toolName}
          icon={<IconBrowseOutline16 size={14} />}
          title={t(model.titleKey)}
          summary={model.summary}
          output={model.output}
          errorSummary={model.errorSummary}
          state={model.state}
          onOpenFile={openFile}
          inspect={inspect}
        />
      )}
      {running && (
        <div className={css.pending} role="status" aria-busy="true" aria-live="polite" aria-label={pendingLabel}>
          <div className={css.label}>{pendingLabel}</div>
          <div className={css.skeletons} data-testid="image-skeletons">
            {Array.from({ length: count }, (_, index) => (
              <div key={index} className={clsx(css.frame, css.skeleton)} data-testid="image-skeleton" />
            ))}
          </div>
        </div>
      )}
      {!running && images.length > 0 && (
        <div className={css.gallery}>
          {images.map(image => (
            <GeneratedThumb
              key={image.attachmentId}
              attachment={image}
              filePath={filePathOf(block, image.attachmentId)}
              loadImage={loadImage}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** Registers generate_image and edit_image conversation rows. */
export const generateImageToolview = {
  name: 'generate-image-toolview',
  inject: ['slots'],
  apply(ctx: Context): void {
    ctx.slots.inject('tool.call.toolview', function* () {
      yield ctx.slots.register({ name: 'tool.call.toolview', key: 'generate_image', locale: NS }, GenerateImageRow)
      yield ctx.slots.register({ name: 'tool.call.toolview', key: 'edit_image', locale: NS }, GenerateImageRow)
    })
  },
}
