/** Browser media types the chat player accepts when the filename has no playable extension. */
const PLAYABLE_AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/webm',
])

/**
 * Media type for a playable audio filename. Matches the Host `session/audio` set.
 * @param name - browser or stored display name.
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

/**
 * Whether a browser file can be played in the composer.
 * @param file - picked file name and browser media type.
 * @returns true for a playable extension or a known audio media type.
 */
export function isPlayableAudioFile(file: { readonly name: string; readonly type: string }): boolean {
  return playableAudioMediaType(file.name) !== undefined || PLAYABLE_AUDIO_TYPES.has(file.type)
}
