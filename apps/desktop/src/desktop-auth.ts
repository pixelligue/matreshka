/** OS-protocol helpers for website-to-Desktop sign-in. */

/** Custom protocol Desktop registers with the operating system. */
export const DESKTOP_AUTH_SCHEME = 'matreshka'

/**
 * Read a one-time auth code from a `matreshka://auth?code=` URL.
 * @param raw - protocol URL from argv, open-url, or a second instance.
 * @returns the code, or undefined when the URL is not a desktop auth handoff.
 */
export function parseDesktopAuthCode(raw: string): string | undefined {
  try {
    const url = new URL(raw.trim().replace(/^["']|["']$/g, ''))
    if (url.protocol !== `${DESKTOP_AUTH_SCHEME}:`) return undefined
    if (url.hostname !== 'auth') return undefined
    const code = url.searchParams.get('code')
    if (code === null || !/^[A-Za-z0-9_-]{8,128}$/.test(code)) return undefined
    return code
  } catch {
    return undefined
  }
}

/**
 * Landing path Desktop opens for website sign-in (register-first, then handoff).
 * @param localeId - Desktop locale id
 * @returns origin-relative path with the desktop handoff query
 */
export function landingHandoffPath(localeId: 'en' | 'zh-CN' | 'ru'): string {
  return `${localeId === 'ru' ? '' : '/en'}/register?next=desktop`
}

/**
 * Find a desktop-auth protocol URL in process or second-instance argv.
 * @param argv - command-line arguments
 * @returns the first matching URL, if any
 */
export function findDesktopAuthUrl(argv: readonly string[]): string | undefined {
  for (const arg of argv) {
    const trimmed = arg.trim().replace(/^["']|["']$/g, '')
    if (trimmed.startsWith(`${DESKTOP_AUTH_SCHEME}:`)) return trimmed
  }
  return undefined
}

/** Arguments for `app.setAsDefaultProtocolClient` in unpackaged Electron. */
export interface UnpackagedProtocolLaunch {
  readonly execPath: string
  readonly appPath: string
  readonly userDataDir: string
}

/**
 * How to register `matreshka://` so Windows does not treat the URL as the app path.
 * Unpackaged launches pass the real app directory and the same userData so the
 * existing instance receives the URL.
 * @param defaultApp - Electron `process.defaultApp`
 * @param unpackaged - exec path, app directory, and userData when unpackaged
 * @returns path and args for `setAsDefaultProtocolClient`, or undefined when packaged
 */
export function protocolClientRegistration(
  defaultApp: boolean,
  unpackaged: UnpackagedProtocolLaunch,
): { path: string; args: string[] } | undefined {
  if (!defaultApp) return undefined
  return {
    path: unpackaged.execPath,
    args: [`--user-data-dir=${unpackaged.userDataDir}`, unpackaged.appPath],
  }
}
