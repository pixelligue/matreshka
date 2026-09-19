/** Product-facing Chat rows that are harness internals, not user conversation. */

/** When true, system prompt, context injections, and permission commands stay off the Chat surface. */
export const chatTranscriptPolicy = {
  hideInternal: false,
  /** When true, the per-turn usage pill and dialog stay off the Chat surface. */
  hideTurnUsage: false,
  /** When true, the composer-dock session stats pills stay unregistered. */
  hideSessionStats: false,
}

/**
 * Visibility for harness-internal Chat rows.
 * @returns hidden when the product composition asked to suppress internals.
 */
export function internalRowVisibility(): 'visible' | 'hidden' {
  return chatTranscriptPolicy.hideInternal ? 'hidden' : 'visible'
}

/**
 * Whether a slash-command card is a permission-preset change, not user chat.
 * @param name - durable command name.
 * @returns true when the product hides that command row.
 */
export function hideInternalCommand(name: string | null | undefined): boolean {
  return chatTranscriptPolicy.hideInternal && name === 'permission'
}
