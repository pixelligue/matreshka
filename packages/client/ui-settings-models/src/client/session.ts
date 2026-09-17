/** Browser-side Matreshka session helpers for sign-in and sign-out. */

import type { ModelsOperations } from './operations.ts'

/** Credential reference the Host llm-pi-ai route resolves per request. */
export const MATRESHKA_SESSION_TOKEN = 'MATRESHKA_SESSION_TOKEN'

/** sessionStorage key for the signed-in email (display only). */
export const MATRESHKA_SESSION_EMAIL = 'MATRESHKA_SESSION_EMAIL'

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
  const token = sessionStorage.getItem(MATRESHKA_SESSION_TOKEN)
  const origin = request.apiOrigin.replace(/\/$/, '')
  try {
    await fetch(`${origin}/v1/auth/logout`, {
      method: 'POST',
      headers: token === null || token.length === 0
        ? {}
        : { Authorization: `Bearer ${token}` },
    })
  } catch {
    // Local credential must still clear if the API is down.
  }
  sessionStorage.removeItem(MATRESHKA_SESSION_TOKEN)
  sessionStorage.removeItem(MATRESHKA_SESSION_EMAIL)
  await request.operations.removeCredential(MATRESHKA_SESSION_TOKEN)
  request.reload()
}
