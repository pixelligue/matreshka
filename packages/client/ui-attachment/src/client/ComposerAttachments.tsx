import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ComposerAttachment, ComposerAttachmentsProps, ComposerFileAttachment, ComposerImageAttachment,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { AudioPlayer, IconCloseFill14, isPlayableAudioFile } from '@deepseek-ai/dsh-client-ui-primitives'
import { AttachmentRail } from '../AttachmentRail.tsx'
import type { AttachmentRailItem } from '../AttachmentRail.tsx'
import { DropOverlay } from '../DropOverlay.tsx'
import { FileCard } from '../FileCard.tsx'
import { ImageLightbox } from '../ImageLightbox.tsx'
import { attachmentRailLabels, dropOverlayLabels, fileCardLabels, lightboxLabels } from './labels.ts'
import { installDocumentDropEvents } from './drop-events.ts'
import css from './ComposerAttachments.module.css'

/** Rail item retaining its browser-owned attachment for callbacks. */
interface ComposerRailItem extends AttachmentRailItem {
  attachment: ComposerAttachment
}

/** Object URL for one picked audio file, revoked when the row unmounts. */
function DraftAudio({ file, label }: { file: File; label: string }) {
  const [url, setUrl] = useState<string | undefined>(undefined)
  useEffect(() => {
    if (typeof URL.createObjectURL !== 'function') return
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => {
      if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(next)
    }
  }, [file])
  if (url === undefined) return null
  return <AudioPlayer src={url} label={label} />
}

/** Draft image previews, pending-file cards, drop target, and original-image preview. */
export function ComposerAttachments({
  attachments, canAcceptDrop, onAddFiles, onRemoveAttachment, uploads, onRetryFile, dropLimits, t,
}: ComposerAttachmentsProps) {
  const [preview, setPreview] = useState<ComposerImageAttachment | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const dragDepth = useRef(0)
  const closePreview = useCallback(() => { setPreview(null) }, [])
  useEffect(() => {
    if (preview !== null && !attachments.some(attachment => attachment.id === preview.id)) setPreview(null)
  }, [attachments, preview])

  useEffect(() => {
    return installDocumentDropEvents(canAcceptDrop, onAddFiles, dragDepth, setDragActive)
  }, [canAcceptDrop, onAddFiles])

  const audioDrafts = useMemo(
    () => attachments.filter((attachment): attachment is ComposerFileAttachment =>
      attachment.kind === 'file' && isPlayableAudioFile(attachment.file)),
    [attachments],
  )
  const railItems = useMemo<ComposerRailItem[]>(() => attachments.flatMap((attachment) => {
    if (attachment.kind === 'file' && isPlayableAudioFile(attachment.file)) return []
    return [{ id: attachment.id, attachment }]
  }), [attachments])

  return (
    <>
      {dragActive && (
        <DropOverlay
          disabled={!canAcceptDrop}
          labels={dropOverlayLabels(t, canAcceptDrop, dropLimits)}
        />
      )}
      {audioDrafts.length > 0 && (
        <div className={css.audioList}>
          {audioDrafts.map((attachment) => {
            const upload = uploads[attachment.id]
            const name = attachment.file.name || t('file.label')
            const failed = upload?.status === 'error'
            return (
              <div key={attachment.id} className={css.audioRow}>
                <div className={css.audioHead}>
                  <span className={css.audioName} title={name}>{name}</span>
                  <button
                    type="button"
                    className={css.audioRemove}
                    aria-label={t('file.remove', { name })}
                    onClick={() => { onRemoveAttachment(attachment.id) }}
                  >
                    <IconCloseFill14 size={12} />
                  </button>
                </div>
                {failed
                  ? (
                    <button
                      type="button"
                      className={css.audioStatus}
                      onClick={() => { onRetryFile(attachment.id) }}
                    >
                      {t('file.uploadFailed')}
                    </button>
                  )
                  : <DraftAudio file={attachment.file} label={t('audio.label', { name })} />}
                {upload?.status === 'uploading' && (
                  <span className={css.audioStatus}>{t('file.uploading')}</span>
                )}
              </div>
            )
          })}
        </div>
      )}
      {railItems.length > 0 && (
        <div className={css.rail}>
          <AttachmentRail
            items={railItems}
            labels={attachmentRailLabels(t)}
            renderItem={(item) => {
              const attachment = item.attachment
              if (attachment.kind === 'file') {
                const upload = uploads[attachment.id]
                return (
                  <FileCard
                    name={attachment.file.name || t('file.label')}
                    bytes={attachment.file.size}
                    state={upload === undefined || upload.status === 'uploading'
                      ? 'uploading'
                      : upload.status === 'ready' ? 'ready' : 'error'}
                    {...upload?.status === 'uploading' && upload.total !== undefined && upload.total > 0
                      ? { progress: upload.loaded / upload.total }
                      : {}}
                    labels={fileCardLabels(t, attachment.file.name)}
                    onRemove={() => { onRemoveAttachment(attachment.id) }}
                    onRetry={() => { onRetryFile(attachment.id) }}
                  />
                )
              }
              return (
                <div className={css.imageItem}>
                  <button
                    type="button"
                    className={css.thumbnail}
                    title={t('image.openOriginal')}
                    onClick={() => { setPreview(attachment) }}
                  >
                    <img src={attachment.previewUrl} alt={attachment.file.name || t('image.pending')} />
                  </button>
                  <button
                    type="button"
                    className={css.remove}
                    aria-label={t('image.remove', { name: attachment.file.name })}
                    onClick={() => { onRemoveAttachment(attachment.id) }}
                  >
                    <IconCloseFill14 size={12} />
                  </button>
                </div>
              )
            }}
          />
        </div>
      )}
      {preview !== null && (
        <ImageLightbox
          src={preview.previewUrl}
          alt={preview.file.name || t('image.original')}
          labels={lightboxLabels(t)}
          onClose={closePreview}
        />
      )}
    </>
  )
}
