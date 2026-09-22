/** Twelve-pixel plus used on round add controls. The glyph is a path so it sits in the center of the circle. */

import type { ReactNode } from 'react'

/**
 * Draw a centered plus.
 * @returns the icon.
 */
export function PlusMark(): ReactNode {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M6 1.5v9M1.5 6h9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
