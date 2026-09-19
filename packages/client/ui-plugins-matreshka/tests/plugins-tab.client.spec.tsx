// @vitest-environment jsdom
import type { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, within } from '@testing-library/react'
import { SlotTestRuntime } from '@deepseek-ai/dsh-client-test-runtime'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { en as commonEn } from '@deepseek-ai/dsh-client-locale/src/locales/en.ts'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import type { ILayout, MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import type { PropsRenderSlots, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { apply as sidebarApply, inject as sidebarInject } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { PLUGIN_IDS, PLUGIN_PANEL_ID } from '../src/catalog.ts'
import { apply, inject } from '../src/client/index.ts'
import { apply as hostApply } from '../src/index.ts'
import { mergeCatalog, parsePluginStatus } from '../src/client/api.ts'

const runtimes = new Set<SlotTestRuntime>()

afterEach(async () => {
  try {
    for (const runtime of runtimes) await runtime.dispose()
  } finally {
    runtimes.clear()
    cleanup()
    vi.unstubAllGlobals()
    sessionStorage.clear()
  }
})

async function bench(collapsed = false) {
  const runtime = await SlotTestRuntime.create()
  runtimes.add(runtime)
  const locale = new LocaleRuntime(runtime.ctx)
  locale.setLocale('en')
  const startSession = vi.fn()
  const layout = {
    beginNavigation: vi.fn(() => new AbortController().signal),
    toggleSidebar: vi.fn(),
    selectPanel: vi.fn((activePanelId: MainPanelId | null) => { runtime.panelInfo.set({ activePanelId }) }),
    openRightbar: vi.fn(),
    closeRightbar: vi.fn(),
  } satisfies ILayout
  await runtime.mount({
    inject: ['slots'],
    apply(ctx: Context) {
      ctx.provide('layout', layout)
      ctx.provide('uiWorkspace', { startSession } as never)
      ctx.provide('locale', locale)
      ctx.effect(() => locale.register('common', { zh: commonZh, en: commonEn }), 'plugins test: common locale')
      ctx.slots.installLocale(locale)
      ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'conversation' }, () => (
        <p>Conversation content</p>
      )))
    },
  })
  function Frame({ usePanelInfo, renderSlot }: PropsRuntime<'root'> & PropsRenderSlots<'sidebar' | 'main'>) {
    const activePanelId = usePanelInfo(info => info.activePanelId)
    return (
      <>
        <aside>{renderSlot('sidebar', { collapsed, width: collapsed ? 56 : 300 })}</aside>
        <main>{renderSlot('main', {}, { entryKey: activePanelId ?? 'conversation' })}</main>
      </>
    )
  }
  await runtime.root.declare({
    sidebar: { kind: 'single', scope: 'root' },
    main: { kind: 'keyed', scope: 'root' },
  }, Frame)
  const sidebar = await runtime.mount({ inject: [...sidebarInject], apply: sidebarApply })
  const plugins = await runtime.mount({ inject: [...inject], apply })
  const view = runtime.renderRoot()
  return { runtime, locale, layout, startSession, sidebar, plugins, view }
}

describe('matreshka plugins tab', () => {
  it('keeps the host Loader entry inert', () => {
    expect(hostApply).not.toThrow()
  })

  it('declares only the services it uses', () => {
    expect(inject).toEqual(['slots', 'locale'])
  })

  it('lists exactly the four CIS ids and omits Documents', () => {
    expect([...PLUGIN_IDS]).toEqual(['amocrm', 'bitrix24', 'tilda', 'hotels'])
    expect(PLUGIN_IDS).not.toContain('documents')
    expect(mergeCatalog([]).map(row => row.id)).toEqual([...PLUGIN_IDS])
    expect(parsePluginStatus({ id: 'documents', enabled: true, connected: true })).toBeUndefined()
  })

  it('places Plugins under New session, opens the catalog, and returns to chat on New session', async () => {
    const { view, layout, startSession, runtime } = await bench()
    expect(view.getByText('Conversation content')).toBeTruthy()
    const navigation = await view.findByRole('navigation', { name: 'Global panels' })
    const newSession = navigation.previousElementSibling as HTMLButtonElement
    expect(newSession.getAttribute('aria-label')).toBe('New session')
    const pluginsRow = within(navigation).getByRole('button', { name: 'Plugins' })
    expect(newSession.compareDocumentPosition(pluginsRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(pluginsRow.querySelector('[data-testid="plugins-icon"]')).toBeTruthy()
    expect(runtime.slots.entries('sidebar.panellist').map(entry => entry.options.id)).toEqual([PLUGIN_PANEL_ID])
    expect(runtime.slots.entries('main').map(entry => entry.options.key)).toEqual(['conversation', PLUGIN_PANEL_ID])

    fireEvent.click(pluginsRow)
    expect(layout.selectPanel).toHaveBeenCalledWith(PLUGIN_PANEL_ID)
    const catalog = await view.findByTestId('plugins-catalog')
    expect(view.queryByText('Conversation content')).toBeNull()
    expect(within(catalog).getByRole('heading', { name: 'Plugins' })).toBeTruthy()
    expect(view.getByTestId('plugin-card-amocrm')).toBeTruthy()
    expect(view.getByTestId('plugin-card-bitrix24')).toBeTruthy()
    expect(view.getByTestId('plugin-card-tilda')).toBeTruthy()
    expect(view.getByTestId('plugin-card-hotels')).toBeTruthy()
    expect(within(catalog).getByText('Amadeus')).toBeTruthy()
    expect(view.queryByText(/CIS|СНГ|OpenStreetMap/)).toBeNull()
    expect(view.getByTestId('plugin-logo-amocrm').getAttribute('src')).toBe('/plugin-marks/amocrm.png')
    expect(view.getByTestId('plugin-logo-bitrix24').getAttribute('src')).toBe('/plugin-marks/bitrix24.png')
    expect(view.getByTestId('plugin-logo-tilda').getAttribute('src')).toBe('/plugin-marks/tilda.png')
    expect(view.getByTestId('plugin-logo-hotels').getAttribute('src')).toBe('/plugin-marks/amadeus.svg')
    expect(view.queryByTestId('plugin-card-documents')).toBeNull()
    expect(view.queryByText('Documents')).toBeNull()
    expect(view.queryByText('Word')).toBeNull()
    expect(view.queryByText('Excel')).toBeNull()
    expect(view.queryByText('PDF')).toBeNull()
    expect(within(view.getByTestId('plugin-card-amocrm')).getByRole('button', { name: 'Connect' })).toBeTruthy()
    expect(within(view.getByTestId('plugin-card-hotels')).queryByRole('button', { name: 'Connect' })).toBeNull()

    fireEvent.click(newSession)
    expect(startSession).toHaveBeenCalled()
    act(() => { layout.selectPanel(null) })
    expect(view.getByText('Conversation content')).toBeTruthy()
    expect(view.queryByTestId('plugins-catalog')).toBeNull()
  })

  it('keeps the Plugins icon in the collapsed rail', async () => {
    const { view } = await bench(true)
    const navigation = await view.findByRole('navigation', { name: 'Global panels' })
    const pluginsRow = within(navigation).getByRole('button', { name: 'Plugins' })
    expect(pluginsRow.textContent).toBe('')
    expect(pluginsRow.querySelector('[data-testid="plugins-icon"]')).toBeTruthy()
    expect(pluginsRow.querySelector('svg')?.getAttribute('width')).toBe('18')
  })
})
