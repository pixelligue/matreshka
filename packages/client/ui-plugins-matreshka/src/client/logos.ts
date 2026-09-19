import type { PluginId } from '../catalog.ts'

/**
 * Public URLs of the catalog brand marks under `apps/web/public/plugins`.
 */
export const PLUGIN_LOGO_SRC: Record<PluginId, string> = {
  amocrm: '/plugin-marks/amocrm.png',
  bitrix24: '/plugin-marks/bitrix24.png',
  tilda: '/plugin-marks/tilda.png',
  hotels: '/plugin-marks/amadeus.svg',
}
