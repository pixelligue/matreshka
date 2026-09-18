/** Self-hosted Aptabase ingest for Desktop product events. */

import { release as osRelease } from 'node:os'

/** Default self-hosted Aptabase origin. */
export const DEFAULT_MATRESHKA_APTABASE_HOST = 'http://127.0.0.1:8000'

/** Environment variable for the self-hosted App Key (`A-SH-` prefix). */
export const MATRESHKA_APTABASE_APP_KEY = 'MATRESHKA_APTABASE_APP_KEY'

/** Environment variable for the Aptabase origin. */
export const MATRESHKA_APTABASE_HOST = 'MATRESHKA_APTABASE_HOST'

/** Allowlisted product event names. */
export const ANALYTICS_EVENT_NAMES = [
  'app_started',
  'update_check',
  'update_install',
  'ui_sign_in',
  'ui_sign_out',
  'ui_settings_open',
  'ui_new_session',
  'ui_send',
  'ui_web_search',
] as const

/** One allowlisted event name. */
export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number]

const EVENT_NAME_SET = new Set<string>(ANALYTICS_EVENT_NAMES)

const UPDATE_CHECK_OUTCOMES = new Set(['available', 'none', 'error'])

const EVENT_PROP_KEYS: Readonly<Record<AnalyticsEventName, ReadonlySet<string>>> = {
  app_started: new Set(),
  update_check: new Set(['outcome']),
  update_install: new Set(['version']),
  ui_sign_in: new Set(),
  ui_sign_out: new Set(),
  ui_settings_open: new Set(),
  ui_new_session: new Set(),
  ui_send: new Set(),
  ui_web_search: new Set(),
}

const SESSION_TIMEOUT_MS = 60 * 60 * 1000

/** Resolved Aptabase destination. */
export interface AnalyticsConfig {
  /** Self-hosted App Key. */
  readonly appKey: string
  /** Origin without a trailing slash. */
  readonly host: string
}

/** Fields Aptabase stores on every event. */
export interface AnalyticsSystemProps {
  readonly isDebug: boolean
  readonly locale: string
  readonly osName: string
  readonly osVersion: string
  readonly engineName: string
  readonly engineVersion: string
  readonly appVersion: string
  readonly sdkVersion: string
}

/** POST body for `POST /api/v0/event`. */
export interface AnalyticsEventBody {
  readonly timestamp: string
  readonly sessionId: string
  readonly eventName: string
  readonly systemProps: AnalyticsSystemProps
  readonly props?: Record<string, string | number>
}

/** Sends one JSON event. Must not throw into the UI. */
export type AnalyticsPoster = (url: string, appKey: string, body: AnalyticsEventBody) => Promise<void>

/** Inputs for {@link createDesktopAnalytics}. */
export interface DesktopAnalyticsOptions {
  /** Process environment. */
  readonly env: NodeJS.Dict<string>
  /** Electron app identity. */
  readonly app: { readonly isPackaged: boolean; getLocale(): string; getVersion(): string }
  /** `process.platform`. */
  readonly platform: NodeJS.Platform
  /** `os.release()` kernel version. */
  readonly release: string
  /** Chromium version from `process.versions.chrome`. */
  readonly chromeVersion: string
  /** HTTP transport. */
  readonly post: AnalyticsPoster
  /** Clock; tests inject a fixed instant. */
  readonly now?: () => Date
  /** Unit interval used to mint session ids. */
  readonly random?: () => number
}

/**
 * Read a self-hosted Aptabase destination.
 * @param env - process environment.
 * @returns config, or undefined when tracking is off.
 */
export function resolveAnalyticsConfig(env: NodeJS.Dict<string>): AnalyticsConfig | undefined {
  const appKey = env[MATRESHKA_APTABASE_APP_KEY]?.trim() ?? ''
  if (!appKey.startsWith('A-SH-')) return undefined
  const configured = env[MATRESHKA_APTABASE_HOST]?.trim() ?? ''
  const host = (configured.length === 0 ? DEFAULT_MATRESHKA_APTABASE_HOST : configured).replace(/\/$/u, '')
  return { appKey, host }
}

/**
 * Map Node's platform to Aptabase OS fields.
 * @param platform - `process.platform`.
 * @param release - `os.release()`.
 * @returns OS name and version.
 */
export function resolveOperatingSystem(
  platform: NodeJS.Platform,
  release: string,
): { osName: string; osVersion: string } {
  if (platform === 'win32') return { osName: 'Windows', osVersion: release }
  if (platform === 'darwin') return { osName: 'macOS', osVersion: release }
  return { osName: 'Linux', osVersion: release }
}

function looksLikeEmail(value: string): boolean {
  return /[^\s@]+@[^\s@]+\.[^\s@]+/u.test(value)
}

function looksLikeToken(value: string): boolean {
  if (/^Bearer\s+/iu.test(value)) return true
  return value.length >= 32 && /^[A-Za-z0-9+/=._-]+$/u.test(value)
}

function looksLikePath(value: string): boolean {
  return /^(?:[A-Za-z]:[\\/]|\\\\|\/(?:home|Users|tmp|var|etc|project)\b)/u.test(value)
}

function looksLikeMessage(value: string): boolean {
  return value.includes('\n') || (value.length > 80 && value.includes(' '))
}

function forbiddenValue(value: string): boolean {
  return looksLikeEmail(value) || looksLikeToken(value) || looksLikePath(value) || looksLikeMessage(value)
}

/**
 * Drop unknown events and properties that must never leave the machine.
 * @param eventName - renderer-supplied name.
 * @param props - renderer-supplied properties.
 * @returns sanitized event, or undefined when the name is not allowlisted.
 */
export function sanitizeAnalyticsEvent(
  eventName: string,
  props?: Record<string, unknown>,
): { eventName: AnalyticsEventName; props?: Record<string, string | number> } | undefined {
  if (!EVENT_NAME_SET.has(eventName)) return undefined
  const name = eventName as AnalyticsEventName
  const allowed = EVENT_PROP_KEYS[name]
  if (props === undefined) return { eventName: name }
  const next: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(props)) {
    if (!allowed.has(key)) continue
    if (typeof value === 'number' && Number.isFinite(value)) {
      if (name === 'update_check') continue
      next[key] = value
      continue
    }
    if (typeof value !== 'string' || value.length === 0 || forbiddenValue(value)) continue
    if (name === 'update_check' && key === 'outcome' && !UPDATE_CHECK_OUTCOMES.has(value)) continue
    next[key] = value
  }
  return Object.keys(next).length === 0 ? { eventName: name } : { eventName: name, props: next }
}

function newSessionId(now: Date, random: () => number): string {
  const seconds = Math.floor(now.getTime() / 1000).toString()
  const suffix = Math.floor(random() * 100_000_000).toString().padStart(8, '0')
  return seconds + suffix
}

/** Fire-and-forget Aptabase client with an in-process allowlist. */
export class DesktopAnalytics {
  private sessionId: string
  private lastTouched: number

  /**
   * @param config - destination, or undefined to no-op.
   * @param systemProps - OS, version, and debug flag.
   * @param post - HTTP POST.
   * @param now - clock.
   * @param random - session-id entropy.
   */
  constructor(
    private readonly config: AnalyticsConfig | undefined,
    private readonly systemProps: AnalyticsSystemProps,
    private readonly post: AnalyticsPoster,
    private readonly now: () => Date,
    private readonly random: () => number,
  ) {
    const created = now()
    this.sessionId = newSessionId(created, random)
    this.lastTouched = created.getTime()
  }

  /**
   * Queue one allowlisted event. Never throws.
   * @param eventName - catalog name or renderer-supplied string.
   * @param props - optional string/number properties.
   */
  track(eventName: string, props?: Record<string, unknown>): void {
    const accepted = sanitizeAnalyticsEvent(eventName, props)
    const config = this.config
    if (accepted === undefined || config === undefined) return
    const instant = this.now()
    if (instant.getTime() - this.lastTouched > SESSION_TIMEOUT_MS) {
      this.sessionId = newSessionId(instant, this.random)
    }
    this.lastTouched = instant.getTime()
    const body: AnalyticsEventBody = {
      timestamp: instant.toISOString(),
      sessionId: this.sessionId,
      eventName: accepted.eventName,
      systemProps: this.systemProps,
      ...(accepted.props === undefined ? {} : { props: accepted.props }),
    }
    void this.post(`${config.host}/api/v0/event`, config.appKey, body).catch((error: unknown) => {
      // Ingest is best-effort; a down Aptabase must not take down Desktop.
      void error
    })
  }
}

/**
 * Build the Desktop analytics client from process facts.
 * @param options - env, app, OS, and poster.
 * @returns a tracker that no-ops without an `A-SH-` key.
 */
export function createDesktopAnalytics(options: DesktopAnalyticsOptions): DesktopAnalytics {
  const os = resolveOperatingSystem(options.platform, options.release)
  const version = options.app.getVersion()
  return new DesktopAnalytics(
    resolveAnalyticsConfig(options.env),
    {
      isDebug: !options.app.isPackaged,
      locale: options.app.getLocale(),
      osName: os.osName,
      osVersion: os.osVersion,
      engineName: 'Chromium',
      engineVersion: options.chromeVersion,
      appVersion: version,
      sdkVersion: `matreshka-desktop@${version}`,
    },
    options.post,
    options.now ?? (() => new Date()),
    options.random ?? Math.random,
  )
}

/** Electron `net.request` surface used for ingest. */
export interface ElectronNetLike {
  request(options: { method: string; url: string; credentials: 'omit' }): ElectronNetRequestLike
}

/** One Electron client request. */
export interface ElectronNetRequestLike {
  setHeader(name: string, value: string): void
  on(event: 'error' | 'abort' | 'response', listener: (...args: unknown[]) => void): void
  write(chunk: string): void
  end(): void
}

/**
 * POST through Electron `net` so system proxies apply.
 * @param net - Electron net module.
 * @returns a poster that swallows transport errors.
 */
export function electronNetPoster(net: ElectronNetLike): AnalyticsPoster {
  return (url, appKey, body) => new Promise((resolve) => {
    let req: ElectronNetRequestLike
    try {
      req = net.request({ method: 'POST', url, credentials: 'omit' })
    } catch {
      // net.request can throw on a malformed URL.
      resolve()
      return
    }
    const finish = (): void => { resolve() }
    req.setHeader('Content-Type', 'application/json')
    req.setHeader('App-Key', appKey)
    req.on('error', finish)
    req.on('abort', finish)
    req.on('response', finish)
    try {
      req.write(JSON.stringify(body))
      req.end()
    } catch {
      // write/end can fail if the request already aborted.
      finish()
    }
  })
}

/**
 * Collect OS release for the current process.
 * @returns `os.release()`.
 */
export function hostRelease(): string {
  return osRelease()
}
