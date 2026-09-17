/**
 * Sign out control on the same sidebar row as Settings.
 */
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { ModelsOperations } from './operations.ts'
import { performSignOut } from './session.ts'
import css from './SignOutFoot.module.css'

/** Injected session revoke dependencies. */
export interface SignOutFootInjected {
  /** Host credential writes. */
  operations: ModelsOperations
  /** Matreshka API origin, without a trailing slash. */
  apiOrigin: string
  /** Reload after the credential is cleared. */
  reload: () => void
}

/** Slot props for the settings-row Sign out action. */
export type SignOutFootProps =
  PropsRuntime<'sidebar.footer.end'> & PropsLocale<'settings.models'> & SignOutFootInjected

/**
 * Render Sign out beside Settings.
 * @param props - sidebar width, locale, and session operations.
 * @returns the footer action.
 */
export function SignOutFoot(props: SignOutFootProps): ReactNode {
  const { wide, t, operations, apiOrigin, reload } = props
  const [busy, setBusy] = useState(false)
  const onSignOut = (): void => {
    if (busy) return
    setBusy(true)
    void performSignOut({ operations, apiOrigin, reload })
  }
  const label = busy ? t('signOutBusy') : t('signOut')
  if (!wide) {
    return (
      <Tooltip label={label} delayMs={500}>
        <button
          type="button"
          className={css.rail}
          aria-label={t('signOut')}
          disabled={busy}
          onClick={onSignOut}
        >
          <svg className={css.railGlyph} width={16} height={16} viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M6.5 3.5H4a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2.5M8 8h6m-2-2.5L14.5 8 12 10.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </Tooltip>
    )
  }
  return (
    <button type="button" className={css.button} disabled={busy} onClick={onSignOut}>
      {label}
    </button>
  )
}
