/** Browser-stored Matreshka site session for login/register pages. */

export const LANDING_SESSION_KEY = 'matreshka.landing.session'

export interface LandingSession {
  token: string
  email: string
}

/**
 * Read the stored site session, if any.
 * @returns token and email, or null when missing or invalid
 */
export function readLandingSession(): LandingSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LANDING_SESSION_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw) as { token?: unknown; email?: unknown }
    if (typeof parsed.token !== 'string' || parsed.token.length === 0) return null
    return {
      token: parsed.token,
      email: typeof parsed.email === 'string' ? parsed.email : '',
    }
  } catch {
    return null
  }
}

/**
 * Persist a site session across reloads.
 * @param session - bearer and email from login or register
 */
export function writeLandingSession(session: LandingSession): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LANDING_SESSION_KEY, JSON.stringify(session))
  } catch {
    // Private mode or quota: keep this tab signed in without persistence.
  }
}

/** Forget the stored site session. */
export function clearLandingSession(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(LANDING_SESSION_KEY)
  } catch {
    // Ignore storage failures on sign-out.
  }
}
