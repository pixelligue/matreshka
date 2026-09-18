/** Desktop overlay hides Trajectory and session-log download. */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import { composeEntries, loadOverlayPatches, loadProfileDirectory } from '@deepseek-ai/dsh-app-boot'
import { createPluginProfile } from '../src/project-manager.ts'

it('disables Trajectory and session-log download after the Desktop host overlay', () => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-desktop-hidden-chrome-'))
  try {
    const profileDir = join(home, 'profiles', 'desktop')
    createPluginProfile(profileDir)
    const installAnchor = fileURLToPath(new URL('../../cli/package.json', import.meta.url))
    const profile = loadProfileDirectory('dsh desktop', profileDir, installAnchor)
    const overlay = fileURLToPath(new URL('../../desktop-host/config/desktop.cordis.patch.yml', import.meta.url))
    const warnings: string[] = []
    const rows = composeEntries([
      ...profile.layers.map(layer => layer.patches),
      profile.patches,
      loadOverlayPatches('dsh desktop', overlay),
    ], message => warnings.push(message))

    expect(rows.find(row => row.id === 'ui-trajectory')).toMatchObject({
      id: 'ui-trajectory',
      disabled: true,
    })
    expect(rows.find(row => row.id === 'session-log-download')).toMatchObject({
      id: 'session-log-download',
      disabled: true,
    })
    expect(warnings).toEqual([])
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})
