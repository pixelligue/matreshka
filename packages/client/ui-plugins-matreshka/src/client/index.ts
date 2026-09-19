/**
 * Browser half of the Matreshka CIS plugins tab: a sidebar panellist row
 * under New session and a keyed main pane that hides chat while open.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { PLUGIN_PANEL_ID } from '../catalog.ts'
import { SESSION_EVENT } from './api.ts'
import { PluginsController } from './controller.ts'
import { en, ru, NS, zh, type PluginsKey } from './locales.ts'
import { PluginsCatalog, type PluginsCatalogInjected } from './PluginsCatalog.tsx'
import { PluginsIcon } from './PluginsIcon.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** CIS plugins tab and catalog copy. */
    plugins: PluginsKey
  }
}

/** Required services for locale registration and the catalog slots. */
export const inject = ['slots', 'locale']

/**
 * Register the Plugins dictionaries, sidebar row, and catalog pane.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  const controller = new PluginsController()
  void controller.load()
  ctx.effect(() => {
    const sync = (): void => { void controller.load() }
    window.addEventListener(SESSION_EVENT, sync)
    return () => { window.removeEventListener(SESSION_EVENT, sync) }
  }, 'ui-plugins-matreshka: session')
  ctx.effect(() => ctx.locale.register(NS, { zh, en, ru }), 'ui-plugins-matreshka: dictionaries')
  const t = ctx.locale.bind(NS)
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: PLUGIN_PANEL_ID,
    order: 10,
    label: () => t('nav'),
  }, PluginsIcon))
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: PLUGIN_PANEL_ID,
    locale: NS,
    inject: (): PluginsCatalogInjected => ({
      hooks: { catalog: controller.catalog },
      enable: (id, enabled) => { void controller.enable(id, enabled) },
      connect: (id, fields) => { void controller.connect(id, fields) },
    }),
  }, PluginsCatalog))
}
