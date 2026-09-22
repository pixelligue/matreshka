/**
 * Blocking Matreshka sign-in overlay. Desktop opens the public site and waits
 * for a one-time protocol code. The web GUI (no Desktop auth bridge) still
 * collects email/password.
 */

import { useEffect, useId, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { ModelsOperations } from './operations.ts'
import type { en } from './locales.ts'
import { MATRESHKA_SESSION_TOKEN, readSessionToken, SESSION_EVENT, writeSession } from './session.ts'
import { trackMatreshkaAnalytics } from './track.ts'
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
  PropsRuntime<'shell.overlay'> & InjectFace<MatreshkaSignInInjected>

type SignInPhase = 'checking' | 'local' | 'website' | 'signed-in'

interface DesktopAuthBridge {
  localLogin(): Promise<boolean>
  openWebsiteLogin(): Promise<void>
  subscribeAuthCode(listener: (code: string) => void): () => void
}

function desktopAuth(): DesktopAuthBridge | undefined {
  return (globalThis as typeof globalThis & { dshDesktop?: { auth?: DesktopAuthBridge } }).dshDesktop?.auth
}

/**
 * Prompt for Matreshka sign-in until a session token is stored.
 * @param props - overlay seat plus injected operations.
 * @returns the full-viewport sign-in page, or null while the overlay decides.
 */
export function MatreshkaSignInDialog(props: MatreshkaSignInDialogProps): ReactNode {
  const { operations, t, apiOrigin } = props
  const titleId = useId()
  const [phase, setPhase] = useState<SignInPhase>('checking')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const origin = apiOrigin.replace(/\/$/, '')

  const acceptToken = async (token: string, account: string): Promise<boolean> => {
    const refused = await operations.storeCredential(MATRESHKA_SESSION_TOKEN, token)
    if (refused !== undefined) return false
    writeSession(token, account)
    trackMatreshkaAnalytics('ui_sign_in')
    setPhase('signed-in')
    return true
  }

  useEffect(() => {
    let cancelled = false
    const decide = (hasSession: boolean): void => {
      if (cancelled) return
      if (hasSession) {
        setPhase('signed-in')
        return
      }
      const auth = desktopAuth()
      if (auth === undefined) {
        setPhase('local')
        return
      }
      void auth.localLogin().then(
        (local) => {
          if (cancelled || readSessionToken().length > 0) return
          setPhase(local ? 'local' : 'website')
        },
        () => {
          if (!cancelled) setPhase('website')
        },
      )
    }
    void operations.describeCredential(MATRESHKA_SESSION_TOKEN).then(
      (info) => { decide(info?.configured === true && readSessionToken().length > 0) },
      () => { decide(false) },
    )
    const onSession = (): void => {
      decide(readSessionToken().length > 0)
    }
    window.addEventListener(SESSION_EVENT, onSession)
    const auth = desktopAuth()
    const stopCodes = auth?.subscribeAuthCode((code) => {
      void (async () => {
        setBusy(true)
        setError(null)
        try {
          const response = await fetch(`${origin}/v1/auth/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          })
          if (!response.ok) {
            setError(t('signInNetwork'))
            return
          }
          const body = await response.json() as { token?: unknown; email?: unknown }
          if (typeof body.token !== 'string' || body.token.length === 0) {
            setError(t('signInNetwork'))
            return
          }
          const account = typeof body.email === 'string' ? body.email : ''
          if (!await acceptToken(body.token, account)) setError(t('signInNetwork'))
        } catch {
          setError(t('signInNetwork'))
        } finally {
          setBusy(false)
        }
      })()
    })
    return () => {
      cancelled = true
      window.removeEventListener(SESSION_EVENT, onSession)
      stopCodes?.()
    }
  }, [operations, origin, t])

  useEffect(() => {
    if (phase !== 'local' && phase !== 'website') return
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
        const response = await fetch(`${origin}/v1/auth/login`, {
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
        const body = await response.json() as { token?: unknown; email?: unknown }
        if (typeof body.token !== 'string' || body.token.length === 0) {
          setError(t('signInNetwork'))
          return
        }
        const signedInEmail = typeof body.email === 'string' && body.email.length > 0 ? body.email : email
        if (!await acceptToken(body.token, signedInEmail)) setError(t('signInNetwork'))
      } catch {
        setError(t('signInNetwork'))
      } finally {
        setBusy(false)
      }
    })()
  }

  const onWebsite = (): void => {
    void (async () => {
      setBusy(true)
      setError(null)
      try {
        await desktopAuth()?.openWebsiteLogin()
      } catch {
        setError(t('signInNetwork'))
      } finally {
        setBusy(false)
      }
    })()
  }

  if (phase !== 'local' && phase !== 'website') return null

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
        {phase === 'website' ? (
          <>
            <p className={styles.hint}>{t('signInWebsiteHint')}</p>
            {error !== null && <p className={styles.error} role="alert">{error}</p>}
            <button className={styles.submit} type="button" disabled={busy} onClick={onWebsite}>
              {busy ? t('signInWebsiteBusy') : t('signInWebsite')}
            </button>
          </>
        ) : (
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
        )}
      </div>
    </div>
  ), document.body)
}
