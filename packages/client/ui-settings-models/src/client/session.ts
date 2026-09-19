/** Browser-side Matreshka session helpers for sign-in and sign-out. */

import type { ModelsOperations } from './operations.ts'
import { trackMatreshkaAnalytics } from './track.ts'

/** Credential reference the Host llm-pi-ai route resolves per request. */
export const MATRESHKA_SESSION_TOKEN = 'MATRESHKA_SESSION_TOKEN'

/** Storage key for the signed-in email (display only). */
export const MATRESHKA_SESSION_EMAIL = 'MATRESHKA_SESSION_EMAIL'

/** Browser event fired after the local session is written or cleared. */
export const SESSION_EVENT = 'matreshka-session'

function emitSession(): void {
  try {
    window.dispatchEvent(new Event(SESSION_EVENT))
  } catch {
    // Not in a window (tests without jsdom listeners still persist keys).
  }
}

function readKey(key: string): string {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function writeKey(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
    sessionStorage.setItem(key, value)
  } catch {
    // Private mode may refuse storage; the Host credential still holds.
  }
}

function removeKey(key: string): void {
  try {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  } catch {
    // Ignore storage access failures while signing out.
  }
}

/**
 * Read the bearer stored in this browser.
 * @returns the token, or an empty string when this window has not signed in.
 */
export function readSessionToken(): string {
  return readKey(MATRESHKA_SESSION_TOKEN)
}

/**
 * Read the signed-in email for the profile row.
 * @returns the email, or an empty string when none is stored.
 */
export function readSessionEmail(): string {
  return readKey(MATRESHKA_SESSION_EMAIL)
}

/**
 * Persist the session in this browser so Plugins can call the API after reload.
 * @param token - session bearer from `/v1/auth/login`.
 * @param email - signed-in address for display.
 */
export function writeSession(token: string, email: string): void {
  writeKey(MATRESHKA_SESSION_TOKEN, token)
  writeKey(MATRESHKA_SESSION_EMAIL, email)
  emitSession()
}

/** Drop the browser-side session keys. */
export function clearSession(): void {
  removeKey(MATRESHKA_SESSION_TOKEN)
  removeKey(MATRESHKA_SESSION_EMAIL)
  emitSession()
}

/** Arguments for {@link performSignOut}. */
export interface SignOutRequest {
  /** Host credential writes. */
  operations: Pick<ModelsOperations, 'removeCredential'>
  /** Matreshka API origin, without a trailing slash. */
  apiOrigin: string
  /** Reload after the credential is cleared. */
  reload: () => void
}

/**
 * Revoke the API session, drop the local credential, and reload chrome.
 * @param request - origin, credential operations, and reload.
 */
export async function performSignOut(request: SignOutRequest): Promise<void> {
  trackMatreshkaAnalytics('ui_sign_out')
  const token = readSessionToken()
  const origin = request.apiOrigin.replace(/\/$/, '')
  try {
    await fetch(`${origin}/v1/auth/logout`, {
      method: 'POST',
      headers: token.length === 0
        ? {}
        : { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(4000),
    })
  } catch {
    // Local credential must still clear if the API is down or slow.
  }
  clearSession()
  try {
    await request.operations.removeCredential(MATRESHKA_SESSION_TOKEN)
  } catch {
    // Reload still has to run so the sign-in page returns.
  }
  request.reload()
}
