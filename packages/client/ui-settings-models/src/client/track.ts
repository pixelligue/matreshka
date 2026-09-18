/** Optional Desktop analytics preload. */
interface DesktopAnalyticsBridge {
  readonly analytics?: {
    readonly track?: (name: string) => unknown
  }
}

/**
 * Record a named Desktop analytics event when the preload bridge exists.
 * @param name - allowlisted event name; the shell drops anything else.
 */
export function trackMatreshkaAnalytics(name: string): void {
  try {
    const track = (globalThis as typeof globalThis & { dshDesktop?: DesktopAnalyticsBridge })
      .dshDesktop?.analytics?.track
    if (typeof track !== 'function') return
    void track(name)
  } catch {
    // Missing or throwing Desktop bridge must not break chrome.
  }
}
