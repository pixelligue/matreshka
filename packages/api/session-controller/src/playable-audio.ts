/** Extensions the chat player can decode, matched on the stored display name. */

/** Largest audio file `session/audio` returns. Larger files stay stored and unplayed after reload. */
export const MAX_PLAYABLE_AUDIO_BYTES = 32 * 1024 * 1024

/**
 * Media type for one playable audio filename.
 * @param name - stored display name, possibly with directories.
 * @returns the audio media type, or undefined when the extension is not playable.
 */
export function playableAudioMediaType(name: string): string | undefined {
  const leaf = name.slice(Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\')) + 1)
  const dot = leaf.lastIndexOf('.')
  const extension = dot <= 0 ? '' : leaf.slice(dot + 1).toLowerCase()
  switch (extension) {
    case 'mp3': return 'audio/mpeg'
    case 'wav': return 'audio/wav'
    case 'ogg':
    case 'oga': return 'audio/ogg'
    case 'm4a': return 'audio/mp4'
    case 'aac': return 'audio/aac'
    case 'webm': return 'audio/webm'
    default: return undefined
  }
}
