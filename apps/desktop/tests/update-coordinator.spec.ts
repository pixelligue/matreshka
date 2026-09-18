import { describe, expect, it, vi } from 'vitest'
import type { AppUpdater } from 'electron-updater'
import { DESKTOP_HOST_PROTOCOL_VERSION } from '../src/host-protocol.ts'
import { parseDesktopRelease } from '../src/release.ts'
import type { DesktopUpdateState } from '../src/ipc.ts'

vi.mock('electron', () => ({ app: { isPackaged: false } }))
vi.mock('electron-updater', () => ({
  default: { autoUpdater: { autoDownload: true, autoInstallOnAppQuit: true } },
}))

const { DesktopUpdateCoordinator } = await import('../src/update-coordinator.ts')

describe('desktop release metadata', () => {
  it('accepts one exact release identity for Electron and dsh', () => {
    expect(parseDesktopRelease({
      schemaVersion: 1,
      version: '1.2.3',
      hostProtocolVersion: DESKTOP_HOST_PROTOCOL_VERSION,
      nodeVersion: '24.17.0',
      pnpmVersion: '11.7.0',
    })).toEqual({
      schemaVersion: 1,
      version: '1.2.3',
      hostProtocolVersion: DESKTOP_HOST_PROTOCOL_VERSION,
      nodeVersion: '24.17.0',
      pnpmVersion: '11.7.0',
    })
  })

  it('rejects invalid versions and unsupported host protocols', () => {
    const base = {
      schemaVersion: 1,
      version: '1.2.3',
      hostProtocolVersion: DESKTOP_HOST_PROTOCOL_VERSION,
      nodeVersion: '24.17.0',
      pnpmVersion: '11.7.0',
    }
    expect(() => parseDesktopRelease({ ...base, version: 'latest' })).toThrow(/invalid desktop release metadata/u)
    expect(() => parseDesktopRelease({ ...base, hostProtocolVersion: 999 })).toThrow(/invalid desktop release metadata/u)
  })
})

describe('desktop update coordinator', () => {
  it('installs one Electron release and restarts after download', async () => {
    const states: DesktopUpdateState[] = []
    const downloadUpdate = vi.fn(async () => [])
    const quitAndInstall = vi.fn()
    const beforeRestart = vi.fn(async () => {})
    const setFeedURL = vi.fn()
    const updater = {
      autoDownload: true,
      autoInstallOnAppQuit: true,
      setFeedURL,
      checkForUpdates: vi.fn(async () => ({
        isUpdateAvailable: true,
        updateInfo: { version: '1.1.0' },
      })),
      downloadUpdate,
      quitAndInstall,
    } as unknown as AppUpdater
    const track = vi.fn()
    const coordinator = new DesktopUpdateCoordinator(
      (state) => {
        states.push(state)
        return state
      },
      beforeRestart,
      updater,
      () => true,
      () => 'http://127.0.0.1:8016/v1/updates/desktop/win-x64/',
      track,
    )

    await expect(coordinator.check()).resolves.toEqual({ phase: 'available', version: '1.1.0' })
    expect(setFeedURL).toHaveBeenCalledWith({
      provider: 'generic',
      url: 'http://127.0.0.1:8016/v1/updates/desktop/win-x64/',
    })
    await expect(coordinator.install()).resolves.toEqual({ phase: 'ready', version: '1.1.0' })
    expect(downloadUpdate).toHaveBeenCalledOnce()
    expect(beforeRestart).toHaveBeenCalledOnce()
    expect(quitAndInstall).toHaveBeenCalledWith(false, true)
    expect(states.map(state => state.phase)).toEqual(['checking', 'available', 'installing', 'ready'])
    expect(track).toHaveBeenCalledWith('update_check', { outcome: 'available' })
    expect(track).toHaveBeenCalledWith('update_install', { version: '1.1.0' })
  })

  it('queues install behind an in-flight check instead of returning the check result', async () => {
    const checked = Promise.withResolvers<{
      isUpdateAvailable: true
      updateInfo: { version: string }
    }>()
    const downloadUpdate = vi.fn(async () => [])
    const updater = {
      autoDownload: true,
      autoInstallOnAppQuit: true,
      setFeedURL: vi.fn(),
      checkForUpdates: vi.fn(() => checked.promise),
      downloadUpdate,
      quitAndInstall: vi.fn(),
    } as unknown as AppUpdater
    const coordinator = new DesktopUpdateCoordinator(
      state => state,
      async () => {},
      updater,
      () => true,
      () => 'http://127.0.0.1:8016/v1/updates/desktop/win-x64/',
    )

    const checking = coordinator.check()
    const installing = coordinator.install()
    expect(downloadUpdate).not.toHaveBeenCalled()
    checked.resolve({ isUpdateAvailable: true, updateInfo: { version: '1.2.0' } })

    await expect(checking).resolves.toEqual({ phase: 'available', version: '1.2.0' })
    await expect(installing).resolves.toEqual({ phase: 'ready', version: '1.2.0' })
    expect(downloadUpdate).toHaveBeenCalledOnce()
  })

  it('does not query a feed when unpackaged', async () => {
    const checkForUpdates = vi.fn()
    const setFeedURL = vi.fn()
    const updater = {
      autoDownload: true,
      autoInstallOnAppQuit: true,
      setFeedURL,
      checkForUpdates,
      downloadUpdate: vi.fn(),
      quitAndInstall: vi.fn(),
    } as unknown as AppUpdater
    const track = vi.fn()
    const coordinator = new DesktopUpdateCoordinator(
      state => state,
      async () => {},
      updater,
      () => false,
      () => 'http://127.0.0.1:8016/v1/updates/desktop/win-x64/',
      track,
    )
    await expect(coordinator.check()).resolves.toEqual({ phase: 'idle' })
    expect(setFeedURL).not.toHaveBeenCalled()
    expect(checkForUpdates).not.toHaveBeenCalled()
    expect(track).not.toHaveBeenCalled()
  })

  it('tracks a packaged check with no update and a failed check', async () => {
    const track = vi.fn()
    const idleUpdater = {
      autoDownload: true,
      autoInstallOnAppQuit: true,
      setFeedURL: vi.fn(),
      checkForUpdates: vi.fn(async () => ({ isUpdateAvailable: false, updateInfo: { version: '1.0.0' } })),
      downloadUpdate: vi.fn(),
      quitAndInstall: vi.fn(),
    } as unknown as AppUpdater
    const idle = new DesktopUpdateCoordinator(
      state => state, async () => {}, idleUpdater, () => true,
      () => 'http://127.0.0.1:8016/v1/updates/desktop/win-x64/', track,
    )
    await expect(idle.check()).resolves.toEqual({ phase: 'idle' })
    expect(track).toHaveBeenCalledWith('update_check', { outcome: 'none' })
    track.mockClear()
    const failing = new DesktopUpdateCoordinator(
      state => state, async () => {}, {
        ...idleUpdater,
        checkForUpdates: vi.fn(async () => { throw new Error('offline') }),
      } as unknown as AppUpdater, () => true,
      () => 'http://127.0.0.1:8016/v1/updates/desktop/win-x64/', track,
    )
    await expect(failing.check()).resolves.toMatchObject({ phase: 'error' })
    expect(track).toHaveBeenCalledWith('update_check', { outcome: 'error' })
  })

  it('does not install when the operator declines an available update', async () => {
    const downloadUpdate = vi.fn()
    const quitAndInstall = vi.fn()
    const updater = {
      autoDownload: true,
      autoInstallOnAppQuit: true,
      setFeedURL: vi.fn(),
      checkForUpdates: vi.fn(async () => ({
        isUpdateAvailable: true,
        updateInfo: { version: '1.4.0' },
      })),
      downloadUpdate,
      quitAndInstall,
    } as unknown as AppUpdater
    const coordinator = new DesktopUpdateCoordinator(
      state => state,
      async () => {},
      updater,
      () => true,
      () => 'http://127.0.0.1:8016/v1/updates/desktop/win-x64/',
    )
    await expect(coordinator.check()).resolves.toEqual({ phase: 'available', version: '1.4.0' })
    expect(downloadUpdate).not.toHaveBeenCalled()
    expect(quitAndInstall).not.toHaveBeenCalled()
  })
})
