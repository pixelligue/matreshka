import { afterEach, describe, expect, it, vi } from 'vitest'
import { trackMatreshkaAnalytics } from '../src/client/track.ts'

afterEach(() => { vi.unstubAllGlobals() })

describe('trackMatreshkaAnalytics', () => {
  it('no-ops without a Desktop bridge and does not fetch', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(() => trackMatreshkaAnalytics('ui_sign_in')).not.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('forwards the event name when the bridge exists', () => {
    const track = vi.fn()
    vi.stubGlobal('dshDesktop', { analytics: { track } })
    trackMatreshkaAnalytics('ui_sign_out')
    expect(track).toHaveBeenCalledWith('ui_sign_out')
  })

  it('swallows a throwing bridge', () => {
    vi.stubGlobal('dshDesktop', { analytics: { track: () => { throw new Error('ipc') } } })
    expect(() => trackMatreshkaAnalytics('ui_send')).not.toThrow()
  })
})
