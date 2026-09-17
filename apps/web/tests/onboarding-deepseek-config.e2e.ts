// Keyless browser e2e: Matreshka first-run is the versioned notice then a
// full-viewport sign-in page. Login is intercepted at the product API origin.
// Zero model calls.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import {
  acknowledgeReloadConnectionLoss, assertFixtureInventory, captureStableAria, compareOrRefreshGolden,
  launchWebScaffold, watchConsole, webSnapshotMode, type WebScaffold,
  WELCOME_NOTICE_ACK_FIELD, WELCOME_NOTICE_COPY,
  WELCOME_NOTICE_VERSION,
} from './scaffold.ts'
import { ZH_BROWSER_LOCALE, saveFailureShot } from './support.ts'

const SNAPSHOT_DIR = fileURLToPath(new URL('./expected/onboarding-deepseek-config', import.meta.url))
const WELCOME_EXPECTED = join(SNAPSHOT_DIR, 'welcome.expected.md')
const SIGN_IN_EXPECTED = join(SNAPSHOT_DIR, 'sign-in.expected.md')
const MODE = webSnapshotMode()
const SIGN_IN_TITLE = '登录 Matreshka'
const DEEPSEEK_KEY_TITLE = '添加一个 API Key 开始使用'

describe.skipIf(MODE === 'record')('web e2e: first-run Matreshka sign-in', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>
  const browserConsole: string[] = []

  beforeAll(async () => {
    scaffold = await launchWebScaffold({ welcomeNoticePending: true, matreshkaSessionPending: true })
    browser = await chromium.launch()
    page = await browser.newPage({ viewport: { width: 1440, height: 960 }, locale: ZH_BROWSER_LOCALE })
    tripwire = watchConsole(page)
    page.on('console', message => browserConsole.push(message.text()))
    await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
    await page.waitForSelector('[class*="frame"]', { timeout: 30_000 })
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
    await scaffold?.close()
  })

  it('walks welcome then a full-page sign-in that stores the session token', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-onboarding-matreshka-sign-in'))
    const welcome = page.getByRole('dialog', { name: WELCOME_NOTICE_COPY.zh.title })
    await welcome.waitFor({ timeout: 15_000 })
    expect(await page.locator('#root').evaluate(root => (root as HTMLElement).inert)).toBe(true)
    for (const paragraph of WELCOME_NOTICE_COPY.zh.body.split('\n\n')) {
      expect(await welcome.getByText(paragraph, { exact: true }).count()).toBe(1)
    }
    const welcomeAria = await captureStableAria(page, '[role="dialog"]', scaffold.workspaceCwd)
    await compareOrRefreshGolden(WELCOME_EXPECTED, welcomeAria, MODE)

    await welcome.getByRole('button', { name: WELCOME_NOTICE_COPY.zh.continueLabel }).click()
    await welcome.waitFor({ state: 'detached', timeout: 15_000 })

    const signIn = page.getByRole('dialog', { name: SIGN_IN_TITLE })
    await signIn.waitFor({ timeout: 15_000 })
    expect(await page.locator('#root').evaluate(root => (root as HTMLElement).inert)).toBe(true)
    expect(await page.getByRole('dialog', { name: DEEPSEEK_KEY_TITLE }).count()).toBe(0)
    expect(await signIn.getByRole('button', { name: '稍后配置' }).count()).toBe(0)
    expect(await page.locator('[data-matreshka-sign-in]').count()).toBe(1)
    const signInAria = await captureStableAria(page, '[data-matreshka-sign-in]', scaffold.workspaceCwd)
    await compareOrRefreshGolden(SIGN_IN_EXPECTED, signInAria, MODE)

    await page.route('**/v1/auth/login', async (route) => {
      expect(route.request().method()).toBe('POST')
      expect(route.request().postDataJSON()).toEqual({ email: 'op@localhost', password: 'secret' })
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'sess-e2e-1' }),
      })
    })
    await signIn.getByLabel('邮箱').fill('op@localhost')
    await signIn.getByLabel('密码').fill('secret')
    await signIn.getByRole('button', { name: '登录' }).click()
    await signIn.waitFor({ state: 'detached', timeout: 15_000 })
    await page.unroute('**/v1/auth/login')
    expect(await page.locator('#root').evaluate(root => (root as HTMLElement).inert)).toBe(false)

    const stored = await readFile(join(scaffold.harnessHome, '.credentials.yaml'), 'utf8')
    expect(stored.includes('MATRESHKA_SESSION_TOKEN: sess-e2e-1')).toBe(true)
    expect(stored.includes('sess-e2e-1') && !(await page.content()).includes('sess-e2e-1')).toBe(true)
    expect(browserConsole.some(line => line.includes('sess-e2e-1'))).toBe(false)

    const acknowledgedSettings = await readFile(join(scaffold.harnessHome, 'settings.yaml'), 'utf8')
    expect(acknowledgedSettings).toContain(`${WELCOME_NOTICE_ACK_FIELD}: ${WELCOME_NOTICE_VERSION}`)

    const secondReloadWarnings = tripwire.warnings.length
    await page.reload({ waitUntil: 'load' })
    acknowledgeReloadConnectionLoss(tripwire, secondReloadWarnings)
    await page.waitForSelector('[class*="frame"]', { timeout: 15_000 })
    expect(await page.getByRole('dialog', { name: WELCOME_NOTICE_COPY.zh.title }).count()).toBe(0)
    expect(await page.getByRole('dialog', { name: SIGN_IN_TITLE }).count()).toBe(0)
    expect(await page.getByRole('dialog', { name: DEEPSEEK_KEY_TITLE }).count()).toBe(0)
    expect(tripwire.warnings).toEqual([])
    expect(tripwire.pageErrors).toEqual([])
  }, 60_000)

  it('never paints the takeover chrome on a configured reload, even with credentials describe held', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-onboarding-configured-reload'))
    await page.addInitScript(() => {
      const sightings: string[] = []
      ;(window as unknown as { __takeoverSightings: string[] }).__takeoverSightings = sightings
      setInterval(() => {
        if (document.querySelector(
          '[role="dialog"][aria-label="内测声明"], '
          + '[data-matreshka-sign-in], '
          + '[role="dialog"][aria-label="添加一个 API Key 开始使用"]',
        ) !== null) {
          sightings.push('chrome')
        }
        if (document.getElementById('root')?.inert === true) sightings.push('inert')
      }, 8)
    })
    let released = false
    const heldRoutes: Array<() => void> = []
    const releaseDescribe = (): void => {
      released = true
      for (const resolve of heldRoutes.splice(0)) resolve()
    }
    await page.route('**/api/credentials/describe', async (route) => {
      if (!released) await new Promise<void>((resolve) => { heldRoutes.push(resolve) })
      await route.continue()
    })
    const warningsBefore = tripwire.warnings.length
    await page.reload({ waitUntil: 'commit' })
    await page.waitForSelector('[class*="frame"]', { timeout: 15_000 })
    await page.waitForTimeout(600)
    releaseDescribe()
    await page.waitForTimeout(400)
    await page.unroute('**/api/credentials/describe')
    acknowledgeReloadConnectionLoss(tripwire, warningsBefore)
    expect(await page.evaluate(() =>
      (window as unknown as { __takeoverSightings: string[] }).__takeoverSightings)).toEqual([])
    expect(await page.getByRole('dialog', { name: WELCOME_NOTICE_COPY.zh.title }).count()).toBe(0)
    expect(await page.getByRole('dialog', { name: SIGN_IN_TITLE }).count()).toBe(0)
    expect(await page.getByRole('dialog', { name: DEEPSEEK_KEY_TITLE }).count()).toBe(0)
    expect(tripwire.pageErrors).toEqual([])
  }, 60_000)

  it('keeps the fixture inventory closed', async () => {
    await assertFixtureInventory(
      SNAPSHOT_DIR,
      ['welcome.expected.md', 'sign-in.expected.md'],
    )
  })
})
