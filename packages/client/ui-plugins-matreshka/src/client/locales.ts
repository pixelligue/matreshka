/** Dictionary namespace owned by this plugin. */
export const NS = 'plugins'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  nav: '插件',
  title: '插件',
  enable: '启用',
  disable: '关闭',
  connect: '连接',
  save: '保存',
  cancel: '取消',
  connected: '已连接',
  disconnected: '未连接',
  needSession: '请先登录 Matreshka。',
  requestFailed: '无法更新插件。',
  amocrm: 'amoCRM',
  'amocrm.description': '读取和更新您的 amoCRM 线索与联系人。',
  'amocrm.subdomain': '子域',
  'amocrm.token': '长期令牌',
  bitrix24: 'Bitrix24',
  'bitrix24.description': '通过入站 webhook 处理 Bitrix24 CRM。',
  'bitrix24.webhook': 'Webhook URL',
  tilda: 'Tilda',
  'tilda.description': '列出并导出 Tilda 页面（Business 套餐）。',
  'tilda.public': 'Public key',
  'tilda.secret': 'Secret key',
  hotels: 'Amadeus',
  'hotels.description': '通过 Amadeus 查找酒店和价格。无法在此预订。',
} satisfies Record<string, string>

/** The plugins namespace key union. */
export type PluginsKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  nav: 'Plugins',
  title: 'Plugins',
  enable: 'Enable',
  disable: 'Disable',
  connect: 'Connect',
  save: 'Save',
  cancel: 'Cancel',
  connected: 'Connected',
  disconnected: 'Not connected',
  needSession: 'Sign in to Matreshka first.',
  requestFailed: 'Could not update this plugin.',
  amocrm: 'amoCRM',
  'amocrm.description': 'Read and update leads and contacts in your amoCRM account.',
  'amocrm.subdomain': 'Subdomain',
  'amocrm.token': 'Long-lived token',
  bitrix24: 'Bitrix24',
  'bitrix24.description': 'Work Bitrix24 CRM through an inbound webhook.',
  'bitrix24.webhook': 'Webhook URL',
  tilda: 'Tilda',
  'tilda.description': 'List and export Tilda pages (Business plan).',
  'tilda.public': 'Public key',
  'tilda.secret': 'Secret key',
  hotels: 'Amadeus',
  'hotels.description': 'Find hotels and rates through Amadeus. Booking is not available here.',
} satisfies Record<PluginsKey, string>

/** Russian dictionary, checked complete against the zh key set. */
export const ru = {
  nav: 'Плагины',
  title: 'Плагины',
  enable: 'Включить',
  disable: 'Выключить',
  connect: 'Подключить',
  save: 'Сохранить',
  cancel: 'Отмена',
  connected: 'Подключено',
  disconnected: 'Не подключено',
  needSession: 'Сначала войдите в Matreshka.',
  requestFailed: 'Не удалось обновить плагин.',
  amocrm: 'amoCRM',
  'amocrm.description': 'Читать и обновлять сделки и контакты в amoCRM.',
  'amocrm.subdomain': 'Поддомен',
  'amocrm.token': 'Долгосрочный токен',
  bitrix24: 'Битрикс24',
  'bitrix24.description': 'CRM Битрикс24 через входящий вебхук.',
  'bitrix24.webhook': 'URL вебхука',
  tilda: 'Тильда',
  'tilda.description': 'Список и выгрузка страниц Tilda (тариф Business).',
  'tilda.public': 'Public key',
  'tilda.secret': 'Secret key',
  hotels: 'Amadeus',
  'hotels.description': 'Искать отели и цены через Amadeus. Бронирования здесь нет.',
} satisfies Record<PluginsKey, string>
