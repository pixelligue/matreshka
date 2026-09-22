'use client'

import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { LandingCopy } from './locales'
import {
  desktopAuthHref,
  loginHref,
  registerHref,
  type LandingLocale,
} from './paths'
import { clearLandingSession, readLandingSession, writeLandingSession } from './session'
import { landingCtaClass, SiteChrome } from './SiteChrome'

export interface AuthPageProps {
  copy: LandingCopy
  locale: LandingLocale
  mode: 'login' | 'register'
  apiOrigin: string
  desktopHandoff: boolean
}

/**
 * Public login or register form. Optionally hands a one-time code to Desktop.
 * @param props - locale copy, form mode, API origin, and desktop handoff flag
 * @returns the auth document
 */
export function AuthPage({
  copy,
  locale,
  mode,
  apiOrigin,
  desktopHandoff,
}: AuthPageProps): ReactNode {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<'handoff' | 'signed-in' | null>(null)
  const origin = apiOrigin.replace(/\/$/, '')
  const nextQuery = desktopHandoff ? '?next=desktop' : ''
  const title = mode === 'login' ? copy.authLoginTitle : copy.authRegisterTitle
  const submit = mode === 'login' ? copy.authSubmitLogin : copy.authSubmitRegister
  const switchHref = mode === 'login'
    ? `${registerHref(locale)}${nextQuery}`
    : `${loginHref(locale)}${nextQuery}`
  const switchLabel = mode === 'login' ? copy.authSwitchToRegister : copy.authSwitchToLogin

  const handoff = async (token: string): Promise<boolean> => {
    const minted = await fetch(`${origin}/v1/auth/desktop-code`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!minted.ok) return false
    const mintedBody = await minted.json() as { code?: unknown }
    if (typeof mintedBody.code !== 'string' || mintedBody.code.length === 0) return false
    setDone('handoff')
    window.location.assign(desktopAuthHref(mintedBody.code))
    return true
  }

  useEffect(() => {
    const existing = readLandingSession()
    if (existing === null) return
    if (!desktopHandoff) {
      setDone('signed-in')
      return
    }
    setBusy(true)
    void handoff(existing.token).then((ok) => {
      if (!ok) {
        setError(copy.authNetwork)
        setDone('signed-in')
      }
    }).finally(() => { setBusy(false) })
  }, [copy.authNetwork, desktopHandoff, origin])

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault()
    void (async () => {
      setBusy(true)
      setError(null)
      try {
        const path = mode === 'login' ? '/v1/auth/login' : '/v1/auth/register'
        const response = await fetch(`${origin}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        if (response.status === 401) {
          setError(copy.authInvalid)
          return
        }
        if (response.status === 409) {
          setError(copy.authExists)
          return
        }
        if (!response.ok) {
          setError(copy.authNetwork)
          return
        }
        const body = await response.json() as { token?: unknown; email?: unknown }
        if (typeof body.token !== 'string' || body.token.length === 0) {
          setError(copy.authNetwork)
          return
        }
        const account = typeof body.email === 'string' && body.email.length > 0 ? body.email : email
        writeLandingSession({ token: body.token, email: account })
        if (!desktopHandoff) {
          setDone('signed-in')
          return
        }
        if (!await handoff(body.token)) {
          setError(copy.authNetwork)
          setDone('signed-in')
        }
      } catch {
        setError(copy.authNetwork)
      } finally {
        setBusy(false)
      }
    })()
  }

  const onSignOut = (): void => {
    clearLandingSession()
    setDone(null)
    setEmail('')
    setPassword('')
    setError(null)
  }

  const onOpenDesktop = (): void => {
    const existing = readLandingSession()
    if (existing === null) return
    setBusy(true)
    setError(null)
    void handoff(existing.token).then((ok) => {
      if (!ok) setError(copy.authNetwork)
    }).finally(() => { setBusy(false) })
  }

  return (
    <SiteChrome copy={copy} locale={locale} document={mode} query={nextQuery}>
      <main className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center px-4 py-16">
        <img src="/matreshka-logo.png" alt="" width={56} height={56} className="mb-8 h-14 w-14 object-contain" />
        <h1 className="text-3xl font-medium tracking-tight">{title}</h1>
        {done === 'handoff' ? (
          <p className="mt-6 text-base text-[#3d4450]">{copy.authHandoff}</p>
        ) : done === 'signed-in' ? (
          <div className="mt-6 flex flex-col gap-4">
            <p className="text-base text-[#3d4450]">{copy.authSignedIn}</p>
            {error !== null && <p className="text-sm text-[#b42318]" role="alert">{error}</p>}
            {desktopHandoff && (
              <button className={landingCtaClass} type="button" disabled={busy} onClick={onOpenDesktop}>
                {busy ? copy.authSubmitting : copy.authOpenDesktop}
              </button>
            )}
            <button className="text-sm text-[#3d4450] underline" type="button" onClick={onSignOut}>
              {copy.authSignOut}
            </button>
          </div>
        ) : (
          <form className="mt-8 flex flex-col gap-4" onSubmit={onSubmit}>
            <label className="flex flex-col gap-2 text-sm text-[#3d4450]">
              {copy.authEmail}
              <input
                className="h-12 rounded-xl border border-black/10 bg-white px-3 text-base text-[#12141a]"
                type="email"
                name="email"
                autoComplete="username"
                autoFocus
                value={email}
                onChange={event => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-[#3d4450]">
              {copy.authPassword}
              <input
                className="h-12 rounded-xl border border-black/10 bg-white px-3 text-base text-[#12141a]"
                type="password"
                name="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={event => setPassword(event.target.value)}
                minLength={mode === 'register' ? 8 : undefined}
                required
              />
            </label>
            {error !== null && <p className="text-sm text-[#b42318]" role="alert">{error}</p>}
            <button className={landingCtaClass} type="submit" disabled={busy}>
              {busy ? copy.authSubmitting : submit}
            </button>
            <a className="text-sm text-[#3d4450] underline" href={switchHref}>{switchLabel}</a>
          </form>
        )}
      </main>
    </SiteChrome>
  )
}
