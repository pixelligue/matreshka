/**
 * Sidebar-foot profile: nesting-doll avatar, signed-in email, and Sign out.
 * Sits above Settings.
 */
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { ModelsOperations } from './operations.ts'
import { readSessionEmail, SESSION_EVENT } from './session.ts'
import css from './ProfileFooter.module.css'

/** Public URL of the nesting-doll mark used as the profile avatar. */
const AVATAR_SRC = '/matreshka-logo.png'

/** Injected session revoke dependencies. */
export interface ProfileFooterInjected {
  /** Host credential writes. */
  operations: ModelsOperations
  /** Matreshka API origin, without a trailing slash. */
  apiOrigin: string
  /** Reload after the credential is cleared. */
  reload: () => void
}

/** Slot props for the sidebar-foot profile action. */
export type ProfileFooterProps =
  PropsRuntime<'sidebar.footer.action'> & PropsLocale<'settings.models'> & ProfileFooterInjected

/**
 * Render the profile row above Settings.
 * @param props - sidebar width, locale, and session operations.
 * @returns the footer action.
 */
export function ProfileFooter(props: ProfileFooterProps): ReactNode {
  const { wide, t } = props
  const [email, setEmail] = useState(readSessionEmail)
  useEffect(() => {
    const sync = (): void => { setEmail(readSessionEmail()) }
    window.addEventListener(SESSION_EVENT, sync)
    return () => { window.removeEventListener(SESSION_EVENT, sync) }
  }, [])
  const label = email.length > 0 ? email : t('profile')

  const avatar = (
    <img
      className={css.avatar}
      src={AVATAR_SRC}
      width={24}
      height={24}
      alt=""
      aria-hidden="true"
    />
  )

  if (!wide) {
    return (
      <Tooltip label={label} delayMs={500}>
        <span className={css.rail} aria-label={label}>
          {avatar}
        </span>
      </Tooltip>
    )
  }

  return (
    <div className={css.row}>
      {avatar}
      <div className={css.meta}>
        <div className={css.email} title={label}>{label}</div>
      </div>
    </div>
  )
}
