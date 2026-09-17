// Keyless browser e2e: the Matreshka composition never shows the DeepSeek
// API-key onboarding step. Ordinary scenarios seed a Matreshka session so the
// full-page sign-in is already complete.
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import {
  launchWebScaffold, watchConsole, webSnapshotMode, type WebScaffold,
} from './scaffold.ts'
import { ZH_BROWSER_LOCALE, saveFailureShot } from './support.ts'

const MODE = webSnapshotMode()
const CREDENTIAL_STEP = '添加一个 API Key 开始使用'
const SIGN_IN_TITLE = '登录 Matreshka'

describe.skipIf(MODE === 'record')('web e2e: Matreshka composition has no DeepSeek API-key onboarding', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>

  beforeAll(async () => {
    scaffold = await launchWebScaffold({})
    browser = await chromium.launch()
    page = await browser.newPage({ viewport: { width: 1440, height: 960 }, locale: ZH_BROWSER_LOCALE })
    tripwire = watchConsole(page)
    await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
    await page.waitForSelector('[class*="frame"]', { timeout: 30_000 })
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
    await scaffold?.close()
  })

  it('does not show DeepSeek API-key onboarding or the sign-in page after a stored session', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-onboarding-matreshka-session'))
    await expect.poll(
      async () => page.getByRole('dialog', { name: CREDENTIAL_STEP }).count(),
      { timeout: 10_000 },
    ).toBe(0)
    await expect.poll(
      async () => page.getByRole('dialog', { name: SIGN_IN_TITLE }).count(),
      { timeout: 5_000 },
    ).toBe(0)
    expect(await page.locator('[data-matreshka-sign-in]').count()).toBe(0)
    expect(await page.locator('#root').evaluate(root => (root as HTMLElement).inert)).toBe(false)
    expect(tripwire.warnings).toEqual([])
    expect(tripwire.pageErrors).toEqual([])
  }, 60_000)
})
