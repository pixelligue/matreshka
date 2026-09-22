/** Browser helpers for download, copy, and share of a resolved image URL. */

/**
 * Download one image URL as a named file.
 * @param src - resolved blob or http URL
 * @param name - download filename
 */
export async function downloadImage(src: string, name: string): Promise<void> {
  const blob = await blobOf(src)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

/**
 * Copy image bytes onto the clipboard when the browser allows it.
 * @param src - resolved image URL
 */
export async function copyImage(src: string): Promise<void> {
  const blob = await blobOf(src)
  const item = new ClipboardItem({ [blob.type || 'image/png']: blob })
  await navigator.clipboard.write([item])
}

/**
 * Share the image as a file, or copy it when share is unavailable.
 * @param src - resolved image URL
 * @param name - file name
 */
export async function shareImage(src: string, name: string): Promise<void> {
  const blob = await blobOf(src)
  const file = new File([blob], name, { type: blob.type || 'image/png' })
  const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void>; canShare?: (data: ShareData) => boolean }
  if (typeof nav.share === 'function' && (nav.canShare === undefined || nav.canShare({ files: [file] }))) {
    await nav.share({ files: [file], title: name })
    return
  }
  await copyImage(src)
}

async function blobOf(src: string): Promise<Blob> {
  const response = await fetch(src)
  if (!response.ok) throw new Error('image fetch failed')
  return await response.blob()
}
