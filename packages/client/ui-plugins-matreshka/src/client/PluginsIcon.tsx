import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'

/**
 * Four-tile glyph for the Plugins sidebar row.
 * @param props.size - square edge from the sidebar row.
 * @returns an inline SVG.
 */
export function PluginsIcon({ size }: PropsRuntime<'sidebar.panellist'>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      data-testid="plugins-icon"
    >
      <rect x="1.5" y="1.5" width="5.75" height="5.75" rx="1.5" fill="currentColor" />
      <rect x="8.75" y="1.5" width="5.75" height="5.75" rx="1.5" fill="currentColor" />
      <rect x="1.5" y="8.75" width="5.75" height="5.75" rx="1.5" fill="currentColor" />
      <rect x="8.75" y="8.75" width="5.75" height="5.75" rx="1.5" fill="currentColor" />
    </svg>
  )
}
