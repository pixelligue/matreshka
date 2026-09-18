/** One Electron release stream for the version-bound shell and bundled dsh runtime. */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import electronUpdater, { type AppUpdater } from 'electron-updater'
import { resolveDesktopAutoUpdateConfig } from '../scripts/desktop-auto-update-environment.mjs'
import type { DesktopUpdateState } from './ipc.ts'
const { autoUpdater } = electronUpdater

/** Optional Aptabase sink for packaged update checks. */
export type DesktopUpdateAnalytics = (name: 'update_check' | 'update_install', props?: Record<string, string>) => void

/** Checks, downloads, and installs one complete Desktop release. */
export class DesktopUpdateCoordinator {
  private availableVersion: string | undefined
  private checkOperation: Promise<DesktopUpdateState> | undefined
  private installOperation: Promise<DesktopUpdateState> | undefined

  /**
   * @param publish - state sink for every desktop window.
   * @param beforeRestart - stop application-owned processes before replacement.
   * @param updater - Electron artifact updater; replaceable for tests.
   * @param enabled - whether this packaged process carries updater configuration.
   * @param feedUrl - generic-provider feed URL for this build's target.
   * @param track - optional product-analytics sink.
   */
  constructor(
    private readonly publish: (state: DesktopUpdateState) => DesktopUpdateState,
    private readonly beforeRestart: () => Promise<void> = async () => {},
    private readonly updater: AppUpdater = autoUpdater,
    private readonly enabled: () => boolean = () => (
      app.isPackaged && existsSync(join(process.resourcesPath, 'app-update.yml'))
    ),
    private readonly feedUrl: () => string = () => (
      resolveDesktopAutoUpdateConfig(process.env, process.platform, process.arch).publicUrl
    ),
    private track: DesktopUpdateAnalytics = () => {},
  ) {
    this.updater.autoDownload = false
    this.updater.autoInstallOnAppQuit = false
  }

  /**
   * Attach product analytics after the shell client exists.
   * @param track - allowlisted Aptabase sink.
   */
  setAnalytics(track: DesktopUpdateAnalytics): void {
    this.track = track
  }

  /** Check the configured Desktop release stream and retain an available version. */
  async check(): Promise<DesktopUpdateState> {
    if (this.installOperation !== undefined) return this.installOperation
    if (this.checkOperation !== undefined) return this.checkOperation
    this.checkOperation = this.doCheck().finally(() => { this.checkOperation = undefined })
    return this.checkOperation
  }

  /** Wait for an in-flight check, then download and install its retained release. */
  async install(): Promise<DesktopUpdateState> {
    if (this.installOperation !== undefined) return this.installOperation
    this.installOperation = (async () => {
      await this.checkOperation
      return this.doInstall()
    })().finally(() => { this.installOperation = undefined })
    return this.installOperation
  }

  private async doCheck(): Promise<DesktopUpdateState> {
    this.publish({ phase: 'checking' })
    try {
      if (!this.enabled()) {
        this.availableVersion = undefined
        return this.publish({ phase: 'idle' })
      }
      this.updater.setFeedURL({ provider: 'generic', url: this.feedUrl() })
      const result = await this.updater.checkForUpdates()
      const version = result?.isUpdateAvailable === true ? result.updateInfo.version : undefined
      this.availableVersion = version
      if (version === undefined) {
        this.track('update_check', { outcome: 'none' })
        return this.publish({ phase: 'idle' })
      }
      this.track('update_check', { outcome: 'available' })
      return this.publish({ phase: 'available', version })
    } catch (error) {
      this.availableVersion = undefined
      this.track('update_check', { outcome: 'error' })
      return this.publish({
        phase: 'error',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private async doInstall(): Promise<DesktopUpdateState> {
    const version = this.availableVersion
    if (version === undefined) {
      throw new Error('desktop update: no verified update is available')
    }
    this.publish({ phase: 'installing', version })
    try {
      await this.updater.downloadUpdate()
      this.availableVersion = undefined
      this.track('update_install', { version })
      const ready = this.publish({ phase: 'ready', version })
      await this.beforeRestart()
      this.updater.quitAndInstall(false, true)
      return ready
    } catch (error) {
      return this.publish({
        phase: 'error',
        version,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
