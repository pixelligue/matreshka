import css from './AudioPlayer.module.css'

/**
 * Native playback control for one already-resolved audio URL.
 * @param props - source URL and accessible name.
 * @returns the audio element.
 */
export function AudioPlayer({ src, label }: {
  /** Browser URL of the audio bytes. */
  src: string
  /** Accessible name for the control. */
  label: string
}) {
  return <audio className={css.player} controls preload="metadata" src={src} aria-label={label} />
}
