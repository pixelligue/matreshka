/**
 * Blocking Matreshka email/password onboarding. Login hits the product API
 * and stores the session token as a Host credential. The gate is a full-viewport
 * page: application chrome stays hidden until a session exists.
 */

import { useEffect, useId, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ModelsOperations } from './operations.ts'
import type { en } from './locales.ts'
import { MATRESHKA_SESSION_EMAIL, MATRESHKA_SESSION_TOKEN } from './session.ts'
import styles from './MatreshkaSignInDialog.module.css'

export { DEFAULT_MATRESHKA_API_ORIGIN } from '../api-origin.ts'
export { MATRESHKA_SESSION_TOKEN } from './session.ts'

/** Registration-side dependencies of {@link MatreshkaSignInDialog}. */
export interface MatreshkaSignInInjected {
  /** Host credential reads and writes. */
  operations: ModelsOperations
  /** Feature copy. */
  t: (key: keyof typeof en) => string
  /** Origin of the Matreshka API, without a trailing slash. */
  apiOrigin: string
}

/** Slot owner props plus the feature's injected dependencies. */
export type MatreshkaSignInDialogProps =
  PropsRuntime<'settings.onboarding'> & InjectFace<MatreshkaSignInInjected>

type SignInPhase = 'checking' | 'needed'

/**
 * Prompt for Matreshka email/password until a session token is stored.
 * @param props - settings-shell owner state and injected operations.
 * @returns the full-viewport sign-in page, or null while the step decides.
 */
export function MatreshkaSignInDialog(props: MatreshkaSignInDialogProps): ReactNode {
  const { complete, operations, t, apiOrigin } = props
  const titleId = useId()
  const [phase, setPhase] = useState<SignInPhase>('checking')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    void operations.describeCredential(MATRESHKA_SESSION_TOKEN).then(
      (info) => {
        if (cancelled) return
        if (info?.configured) {
          complete()
          return
        }
        setPhase('needed')
      },
      () => {
        if (!cancelled) setPhase('needed')
      },
    )
    return () => { cancelled = true }
  }, [complete, operations])

  useEffect(() => {
    if (phase !== 'needed') return
    const appRoot = document.getElementById('root')
    if (appRoot === null) return
    const previous = appRoot.inert
    appRoot.inert = true
    return () => { appRoot.inert = previous }
  }, [phase])

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    void (async () => {
      setBusy(true)
      setError(null)
      try {
        const response = await fetch(`${apiOrigin.replace(/\/$/, '')}/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        if (response.status === 401) {
          setError(t('signInInvalid'))
          return
        }
        if (!response.ok) {
          setError(t('signInNetwork'))
          return
        }
        const body = await response.json() as { token?: unknown }
        if (typeof body.token !== 'string' || body.token.length === 0) {
          setError(t('signInNetwork'))
          return
        }
        const refused = await operations.storeCredential(MATRESHKA_SESSION_TOKEN, body.token)
        if (refused !== undefined) {
          setError(t('signInNetwork'))
          return
        }
        sessionStorage.setItem(MATRESHKA_SESSION_TOKEN, body.token)
        sessionStorage.setItem(MATRESHKA_SESSION_EMAIL, email)
        complete()
      } catch {
        setError(t('signInNetwork'))
      } finally {
        setBusy(false)
      }
    })()
  }

  if (phase !== 'needed') return null

  return createPortal((
    <div
      className={styles.page}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-matreshka-sign-in=""
    >
      <div className={styles.panel}>
        <img
          className={styles.mark}
          src="/matreshka-logo.png"
          width={96}
          height={96}
          alt=""
          aria-hidden="true"
          data-matreshka-logo-slot=""
        />
        <h1 id={titleId} className={styles.title}>{t('signInTitle')}</h1>
        <form className={styles.form} onSubmit={onSubmit}>
          <label className={styles.label}>
            {t('signInEmail')}
            <input
              className={styles.input}
              type="text"
              name="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
            />
          </label>
          <label className={styles.label}>
            {t('signInPassword')}
            <input
              className={styles.input}
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
            />
          </label>
          {error !== null && <p className={styles.error} role="alert">{error}</p>}
          <button className={styles.submit} type="submit" disabled={busy}>
            {busy ? t('signInSubmitting') : t('signInSubmit')}
          </button>
        </form>
      </div>
    </div>
  ), document.body)
}
