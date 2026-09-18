import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import {
  createDesktopAnalytics,
  DEFAULT_MATRESHKA_APTABASE_HOST,
  DesktopAnalytics,
  electronNetPoster,
  resolveAnalyticsConfig,
  resolveOperatingSystem,
  sanitizeAnalyticsEvent,
  type AnalyticsEventBody,
  type AnalyticsPoster,
  type ElectronNetRequestLike,
} from '../src/analytics.ts'

function posted(post: ReturnType<typeof vi.fn>): AnalyticsEventBody {
  const body = post.mock.calls[0]?.[2] as AnalyticsEventBody | undefined
  if (body === undefined) throw new Error('expected an Aptabase POST')
  return body
}

describe('resolveAnalyticsConfig', () => {
  it('disables tracking without an A-SH- App Key', () => {
    expect(resolveAnalyticsConfig({})).toBeUndefined()
    expect(resolveAnalyticsConfig({ MATRESHKA_APTABASE_APP_KEY: '' })).toBeUndefined()
    expect(resolveAnalyticsConfig({ MATRESHKA_APTABASE_APP_KEY: 'A-EU-xxxx' })).toBeUndefined()
  })

  it('defaults the host and strips a trailing slash', () => {
    expect(resolveAnalyticsConfig({ MATRESHKA_APTABASE_APP_KEY: 'A-SH-key' })).toEqual({
      appKey: 'A-SH-key',
      host: DEFAULT_MATRESHKA_APTABASE_HOST,
    })
    expect(resolveAnalyticsConfig({
      MATRESHKA_APTABASE_APP_KEY: 'A-SH-key',
      MATRESHKA_APTABASE_HOST: 'http://127.0.0.1:8000/',
    })).toEqual({ appKey: 'A-SH-key', host: 'http://127.0.0.1:8000' })
  })
})

describe('resolveOperatingSystem', () => {
  it('names Windows, macOS, and Linux', () => {
    expect(resolveOperatingSystem('win32', '10.0.26100')).toEqual({ osName: 'Windows', osVersion: '10.0.26100' })
    expect(resolveOperatingSystem('darwin', '24.0.0')).toEqual({ osName: 'macOS', osVersion: '24.0.0' })
    expect(resolveOperatingSystem('linux', '6.8.0')).toEqual({ osName: 'Linux', osVersion: '6.8.0' })
  })
})

describe('sanitizeAnalyticsEvent', () => {
  it('drops unknown names', () => {
    expect(sanitizeAnalyticsEvent('button_click', { label: 'Send' })).toBeUndefined()
  })

  it('strips email and unknown keys from ui_sign_in', () => {
    expect(sanitizeAnalyticsEvent('ui_sign_in', { email: 'op@localhost', label: 'x' })).toEqual({
      eventName: 'ui_sign_in',
    })
  })

  it('keeps allowlisted update properties and drops forbidden values', () => {
    expect(sanitizeAnalyticsEvent('update_check', { outcome: 'available' })).toEqual({
      eventName: 'update_check',
      props: { outcome: 'available' },
    })
    expect(sanitizeAnalyticsEvent('update_check', { outcome: 'nope' })).toEqual({ eventName: 'update_check' })
    expect(sanitizeAnalyticsEvent('update_install', { version: '1.2.3' })?.props).toEqual({ version: '1.2.3' })
    expect(sanitizeAnalyticsEvent('update_install', { version: 2 })?.props).toEqual({ version: 2 })
    expect(sanitizeAnalyticsEvent('update_check', { outcome: 1 })).toEqual({ eventName: 'update_check' })
    expect(sanitizeAnalyticsEvent('update_install', { version: 'C:\\secret\\path' })).toEqual({
      eventName: 'update_install',
    })
    expect(sanitizeAnalyticsEvent('update_install', { version: 'Bearer abc' })).toEqual({
      eventName: 'update_install',
    })
    expect(sanitizeAnalyticsEvent('ui_send', { text: 'hello world that is definitely a prompt line\nmore' }))
      .toEqual({ eventName: 'ui_send' })
  })
})

describe('DesktopAnalytics', () => {
  const systemProps = {
    isDebug: true,
    locale: 'en-US',
    osName: 'Windows',
    osVersion: '10.0.26100',
    engineName: 'Chromium',
    engineVersion: '132.0.0.0',
    appVersion: '0.1.6-alpha.1',
    sdkVersion: 'matreshka-desktop@0.1.6-alpha.1',
  }

  it('sends no HTTP without a key', () => {
    const post = vi.fn(async () => {})
    const analytics = new DesktopAnalytics(undefined, systemProps, post, () => new Date('2026-09-18T00:00:00.000Z'), () => 0.1)
    analytics.track('app_started')
    expect(post).not.toHaveBeenCalled()
  })

  it('posts allowlisted events to /api/v0/event with App-Key', async () => {
    const post = vi.fn<AnalyticsPoster>(async () => {})
    const analytics = new DesktopAnalytics(
      { appKey: 'A-SH-key', host: 'http://127.0.0.1:8000' },
      systemProps,
      post,
      () => new Date('2026-09-18T00:00:00.000Z'),
      () => 0.1,
    )
    analytics.track('app_started')
    expect(post).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/v0/event',
      'A-SH-key',
      expect.objectContaining({
        eventName: 'app_started',
        systemProps,
        timestamp: '2026-09-18T00:00:00.000Z',
      }),
    )
    expect(posted(post).sessionId).toBe(`${Math.floor(Date.parse('2026-09-18T00:00:00.000Z') / 1000)}10000000`)
    expect(posted(post).props).toBeUndefined()
    await Promise.resolve()
  })

  it('does not post unknown names', () => {
    const post = vi.fn(async () => {})
    const analytics = new DesktopAnalytics(
      { appKey: 'A-SH-key', host: 'http://127.0.0.1:8000' },
      systemProps,
      post,
      () => new Date('2026-09-18T00:00:00.000Z'),
      () => 0.1,
    )
    analytics.track('button_click', { label: 'Send' })
    expect(post).not.toHaveBeenCalled()
  })

  it('swallows poster failures', async () => {
    const post = vi.fn(async () => { throw new Error('offline') })
    const analytics = new DesktopAnalytics(
      { appKey: 'A-SH-key', host: 'http://127.0.0.1:8000' },
      systemProps,
      post,
      () => new Date('2026-09-18T00:00:00.000Z'),
      () => 0.1,
    )
    expect(() => analytics.track('ui_send')).not.toThrow()
    await Promise.resolve()
  })

  it('rotates the session after an hour of idle time', () => {
    const post = vi.fn(async () => {})
    let now = new Date('2026-09-18T00:00:00.000Z')
    const analytics = new DesktopAnalytics(
      { appKey: 'A-SH-key', host: 'http://127.0.0.1:8000' },
      systemProps,
      post,
      () => now,
      () => 0.2,
    )
    analytics.track('app_started')
    const first = posted(post).sessionId
    now = new Date('2026-09-18T01:00:01.000Z')
    analytics.track('ui_send')
    expect(post.mock.calls[1]?.[2]).toMatchObject({ eventName: 'ui_send' })
    expect((post.mock.calls[1]?.[2] as AnalyticsEventBody).sessionId).not.toBe(first)
  })
})

describe('createDesktopAnalytics', () => {
  it('marks unpackaged builds debug and packaged builds release', () => {
    const post = vi.fn(async () => {})
    const unpackaged = createDesktopAnalytics({
      env: { MATRESHKA_APTABASE_APP_KEY: 'A-SH-key' },
      app: { isPackaged: false, getLocale: () => 'ru', getVersion: () => '0.1.6-alpha.1' },
      platform: 'win32',
      release: '10.0.26100',
      chromeVersion: '132.0.0.0',
      post,
      now: () => new Date('2026-09-18T00:00:00.000Z'),
      random: () => 0,
    })
    unpackaged.track('app_started')
    expect(posted(post).systemProps).toMatchObject({
      isDebug: true,
      osName: 'Windows',
      osVersion: '10.0.26100',
      appVersion: '0.1.6-alpha.1',
      engineName: 'Chromium',
      locale: 'ru',
    })
    post.mockClear()
    const packaged = createDesktopAnalytics({
      env: { MATRESHKA_APTABASE_APP_KEY: 'A-SH-key' },
      app: { isPackaged: true, getLocale: () => 'en-US', getVersion: () => '1.0.0' },
      platform: 'darwin',
      release: '24.0.0',
      chromeVersion: '132.0.0.0',
      post,
      now: () => new Date('2026-09-18T00:00:00.000Z'),
      random: () => 0,
    })
    packaged.track('app_started')
    expect(posted(post).systemProps).toMatchObject({ isDebug: false, osName: 'macOS', appVersion: '1.0.0' })
  })
})

describe('electronNetPoster', () => {
  it('POSTs JSON with App-Key and resolves on response', async () => {
    const req = Object.assign(new EventEmitter(), {
      setHeader: vi.fn(),
      write: vi.fn(),
      end: vi.fn(function (this: EventEmitter) { this.emit('response') }),
    })
    const net = { request: vi.fn(() => req as unknown as ElectronNetRequestLike) }
    const poster = electronNetPoster(net)
    await poster('http://127.0.0.1:8000/api/v0/event', 'A-SH-key', {
      timestamp: '2026-09-18T00:00:00.000Z',
      sessionId: '1',
      eventName: 'app_started',
      systemProps: {
        isDebug: true, locale: 'en', osName: 'Windows', osVersion: '1',
        engineName: 'Chromium', engineVersion: '1', appVersion: '1', sdkVersion: 'x',
      },
    })
    expect(net.request).toHaveBeenCalledWith({
      method: 'POST',
      url: 'http://127.0.0.1:8000/api/v0/event',
      credentials: 'omit',
    })
    expect(req.setHeader).toHaveBeenCalledWith('App-Key', 'A-SH-key')
    expect(req.write).toHaveBeenCalledWith(expect.stringContaining('"eventName":"app_started"'))
  })

  it('resolves when request construction fails', async () => {
    const poster = electronNetPoster({
      request: () => { throw new Error('bad url') },
    })
    await expect(poster('not-a-url', 'A-SH-key', {
      timestamp: 't', sessionId: '1', eventName: 'app_started',
      systemProps: {
        isDebug: true, locale: 'en', osName: 'Windows', osVersion: '1',
        engineName: 'Chromium', engineVersion: '1', appVersion: '1', sdkVersion: 'x',
      },
    })).resolves.toBeUndefined()
  })

  it('resolves when write fails', async () => {
    const req = Object.assign(new EventEmitter(), {
      setHeader: vi.fn(),
      write: () => { throw new Error('write') },
      end: vi.fn(),
    })
    const poster = electronNetPoster({ request: () => req as unknown as ElectronNetRequestLike })
    await expect(poster('http://127.0.0.1:8000/api/v0/event', 'A-SH-key', {
      timestamp: 't', sessionId: '1', eventName: 'app_started',
      systemProps: {
        isDebug: true, locale: 'en', osName: 'Windows', osVersion: '1',
        engineName: 'Chromium', engineVersion: '1', appVersion: '1', sdkVersion: 'x',
      },
    })).resolves.toBeUndefined()
  })
})
