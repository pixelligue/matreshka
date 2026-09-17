/**
 * Settings → General control that revokes the Matreshka session and returns
 * the operator to the blocking sign-in page.
 */
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { ModelsOperations } from './operations.ts'
import { performSignOut } from './session.ts'
import css from './SignOutRow.module.css'

/** Injected session revoke dependencies. */
export interface SignOutInjected {
  /** Host credential writes. */
  operations: ModelsOperations
  /** Matreshka API origin, without a trailing slash. */
  apiOrigin: string
  /** Reload after the credential is cleared so onboarding runs again. */
  reload: () => void
}

/** Slot props for the Sign out general-settings row. */
export type SignOutRowProps =
  PropsRuntime<'settings.general.item'> & PropsLocale<'settings.models'> & SignOutInjected

/**
 * Render the Sign out row.
 * @param props - locale seat plus session operations.
 * @returns the general-settings row.
 */
export function SignOutRow(props: SignOutRowProps): ReactNode {
  const { t, operations, apiOrigin, reload } = props
  const [busy, setBusy] = useState(false)

  const onSignOut = (): void => {
    if (busy) return
    setBusy(true)
    void performSignOut({ operations, apiOrigin, reload })
  }

  return (
    <div className={css.row}>
      <div className={css.rowText}>
        <div className={css.title}>{t('signOutTitle')}</div>
      </div>
      <button type="button" className={css.selector} disabled={busy} onClick={onSignOut}>
        {busy ? t('signOutBusy') : t('signOut')}
      </button>
    </div>
  )
}
