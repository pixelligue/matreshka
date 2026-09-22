import { useCallback, useState } from 'react'
import { Button, Input, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { CONNECTABLE_IDS, PLUGIN_CARDS, isConnectable, type PluginId } from '../catalog.ts'
import type { CatalogSnapshot, ConnectFields, PluginStatus } from './api.ts'
import { NS, type PluginsKey } from './locales.ts'
import { PLUGIN_LOGO_SRC } from './logos.ts'
import { McpServers } from './McpServers.tsx'
import { PlusMark } from './PlusMark.tsx'
import { SkillsPane } from './SkillsPane.tsx'
import css from './PluginsCatalog.module.css'

/** Browser operations injected into the Plugins catalog pane. */
export interface PluginsCatalogInjected {
  hooks: {
    catalog: ObservableSnapshot<CatalogSnapshot>
  }
  enable: (id: PluginId, enabled: boolean) => void
  connect: (id: PluginId, fields: ConnectFields) => void
}

/** Full props for the Plugins catalog pane. */
export type PluginsCatalogProps =
  PropsRuntime<'main'>
  & PropsLocale<typeof NS>
  & InjectFace<PluginsCatalogInjected>

/**
 * Render the Plugins pane: integration cards, skills, and custom MCP servers. Documents are not listed.
 * @param props - locale, catalog snapshot, and enable/connect callbacks.
 * @returns the catalog pane.
 */
export function PluginsCatalog({ t, useCatalog, enable, connect }: PluginsCatalogProps) {
  const snapshot = useCatalog(state => state)
  const [openId, setOpenId] = useState<PluginId | null>(null)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'integrations' | 'skills' | 'mcp'>('integrations')
  const [menu, setMenu] = useState(false)
  const [offersOpen, setOffersOpen] = useState(false)
  const [skillForm, setSkillForm] = useState(false)
  const [mcpForm, setMcpForm] = useState(false)
  const [skillNames, setSkillNames] = useState<readonly string[]>([])
  const [mcpNames, setMcpNames] = useState<readonly string[]>([])
  const onSkills = useCallback((names: readonly string[]) => { setSkillNames(names) }, [])
  const onMcp = useCallback((names: readonly string[]) => { setMcpNames(names) }, [])
  const needle = query.trim().toLowerCase()
  const cards = PLUGIN_CARDS.filter((card) => {
    if (needle === '') return true
    return t(card.title).toLowerCase().includes(needle) || t(card.description).toLowerCase().includes(needle)
  })
  const installed: { key: string; label: string; logo?: string }[] = [
    ...PLUGIN_CARDS.filter(card => statusOf(card.title, snapshot.plugins).enabled).map(card => ({
      key: card.title,
      label: t(card.title),
      logo: PLUGIN_LOGO_SRC[card.title],
    })),
    ...skillNames.map(name => ({ key: `skill:${name}`, label: name })),
    ...mcpNames.map(name => ({ key: `mcp:${name}`, label: name })),
  ].filter(chip => needle === '' || chip.label.toLowerCase().includes(needle))
  const openAdd = (kind: 'skills' | 'mcp'): void => {
    setMenu(false)
    setTab(kind)
    if (kind === 'skills') setSkillForm(true)
    else setMcpForm(true)
  }
  const enabledCards = cards.filter(card => statusOf(card.title, snapshot.plugins).enabled)
  const offeredCards = cards.filter(card => !statusOf(card.title, snapshot.plugins).enabled)
  return (
    <section className={css.pane} data-testid="plugins-catalog">
      <div className={css.catalog}>
        <header className={css.header}>
          <h1 className={css.title}>{t('title')}</h1>
          <div className={css.menuWrap}>
            <button
              type="button"
              className={css.menuButton}
              aria-expanded={menu}
              aria-haspopup="menu"
              onClick={() => { setMenu(current => !current) }}
            >
              {t('addMenu')}
            </button>
            {menu && (
              <div className={css.menu} role="menu">
                <button type="button" className={css.menuItem} role="menuitem" onClick={() => { openAdd('skills') }}>
                  <span className={css.menuPlus} aria-hidden="true"><PlusMark /></span>
                  {t('addSkill')}
                </button>
                <button type="button" className={css.menuItem} role="menuitem" onClick={() => { openAdd('mcp') }}>
                  <span className={css.menuPlus} aria-hidden="true"><PlusMark /></span>
                  {t('addMcp')}
                </button>
              </div>
            )}
          </div>
        </header>
        <p className={css.subtitle}>{t('subtitle')}</p>
        {!snapshot.signedIn && <p className={css.notice}>{t('needSession')}</p>}
        {snapshot.error !== undefined && <p className={css.notice}>{t('requestFailed')}</p>}
        <input
          className={css.search}
          value={query}
          placeholder={t('search')}
          aria-label={t('search')}
          onChange={(event) => { setQuery(event.target.value) }}
        />
        {installed.length > 0 && (
          <section className={css.installed}>
            <h2 className={css.sectionTitle}>{t('installed')}</h2>
            <div className={css.chips}>
              {installed.map(chip => (
                <span key={chip.key} className={css.chip}>
                  {chip.logo !== undefined
                    ? <img className={css.chipLogo} src={chip.logo} alt="" width={24} height={24} />
                    : <span className={css.glyph} aria-hidden="true">{chip.label.slice(0, 1).toUpperCase()}</span>}
                  {chip.label}
                </span>
              ))}
            </div>
          </section>
        )}
        <div className={css.tabRow}>
          <div className={css.tabs} role="tablist">
            <button type="button" role="tab" className={css.tab} aria-selected={tab === 'integrations'} onClick={() => { setTab('integrations') }}>{t('integrations')}</button>
            <button type="button" role="tab" className={css.tab} aria-selected={tab === 'skills'} onClick={() => { setTab('skills') }}>{t('tabs.skills')}</button>
            <button type="button" role="tab" className={css.tab} aria-selected={tab === 'mcp'} onClick={() => { setTab('mcp') }}>{t('tabs.mcp')}</button>
          </div>
          {tab === 'integrations' && (
            <button type="button" className={css.plus} aria-expanded={offersOpen} aria-label={t('addIntegration')} onClick={() => { setOffersOpen(open => !open) }}>
              <PlusMark />
            </button>
          )}
          {tab === 'skills' && (
            <button type="button" className={css.plus} aria-expanded={skillForm} aria-label={t('addSkill')} onClick={() => { setSkillForm(open => !open) }}>
              <PlusMark />
            </button>
          )}
          {tab === 'mcp' && (
            <button type="button" className={css.plus} aria-expanded={mcpForm} aria-label={t('addMcp')} onClick={() => { setMcpForm(open => !open) }}>
              <PlusMark />
            </button>
          )}
        </div>
        {tab === 'integrations' && (
          <section>
            {offersOpen && offeredCards.length > 0 && (
              <div className={css.grid}>
                {offeredCards.map(card => (
                  <button
                    key={card.title}
                    type="button"
                    className={css.offer}
                    disabled={!snapshot.signedIn}
                    onClick={() => {
                      enable(card.title, true)
                      setOffersOpen(false)
                    }}
                  >
                    <span className={css.mark} aria-hidden="true">
                      <img className={css.logo} src={PLUGIN_LOGO_SRC[card.title]} alt="" width={28} height={28} data-testid={`plugin-logo-${card.title}`} />
                    </span>
                    <span className={css.copy}>
                      <span className={css.name}>{t(card.title)}</span>
                      <span className={css.description}>{t(card.description)}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {enabledCards.length === 0 && !offersOpen && <p className={css.notice}>{t('integrationsEmpty')}</p>}
            {enabledCards.length > 0 && (
              <div className={css.grid}>
                {enabledCards.map((card) => {
                  const status = statusOf(card.title, snapshot.plugins)
                  return (
                    <article
                      key={card.title}
                      className={css.card}
                      data-plugin={card.title}
                      data-testid={`plugin-card-${card.title}`}
                    >
                      <div className={css.cardTop}>
                        <div className={css.identity}>
                          <span className={css.mark} aria-hidden="true">
                            <img
                              className={css.logo}
                              src={PLUGIN_LOGO_SRC[card.title]}
                              alt=""
                              width={72}
                              height={40}
                              data-testid={`plugin-logo-${card.title}`}
                            />
                          </span>
                          <div className={css.copy}>
                            <h2 className={css.name}>{t(card.title)}</h2>
                            <p className={css.description}>{t(card.description)}</p>
                          </div>
                        </div>
                        <div className={css.actions}>
                          {isConnectable(card.title) && (
                            <button
                              type="button"
                              className={css.plus}
                              aria-label={t('connect')}
                              aria-expanded={openId === card.title}
                              disabled={!snapshot.signedIn}
                              onClick={() => { setOpenId(current => current === card.title ? null : card.title) }}
                            >
                              <PlusMark />
                            </button>
                          )}
                          <Switch
                            checked={status.enabled}
                            onChange={(next) => { enable(card.title, next) }}
                            label={status.enabled ? t('disable') : t('enable')}
                            disabled={!snapshot.signedIn}
                          />
                        </div>
                      </div>
                      {isConnectable(card.title) && (
                        <p className={css.status}>
                          {status.connected ? t('connected') : t('disconnected')}
                        </p>
                      )}
                      {openId === card.title && isConnectable(card.title) && (
                        <ConnectForm
                          id={card.title}
                          t={t}
                          onCancel={() => { setOpenId(null) }}
                          onSave={(fields) => {
                            connect(card.title, fields)
                            setOpenId(null)
                          }}
                        />
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )}
        <div hidden={tab !== 'skills'}>
          <SkillsPane t={t} query={query} formOpen={skillForm} onDismiss={() => { setSkillForm(false) }} onListed={onSkills} />
        </div>
        <div hidden={tab !== 'mcp'}>
          <McpServers t={t} query={query} formOpen={mcpForm} onDismiss={() => { setMcpForm(false) }} onListed={onMcp} />
        </div>
      </div>
    </section>
  )
}

function statusOf(id: PluginId, plugins: readonly PluginStatus[]): PluginStatus {
  return plugins.find(row => row.id === id) ?? { id, enabled: false, connected: false }
}

function ConnectForm({
  id,
  t,
  onCancel,
  onSave,
}: {
  id: (typeof CONNECTABLE_IDS)[number]
  t: (key: PluginsKey) => string
  onCancel: () => void
  onSave: (fields: ConnectFields) => void
}) {
  const [subdomain, setSubdomain] = useState('')
  const [token, setToken] = useState('')
  const [webhook, setWebhook] = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  return (
    <form
      className={css.form}
      onSubmit={(event) => {
        event.preventDefault()
        if (id === 'amocrm') onSave({ subdomain, token })
        else if (id === 'bitrix24') onSave({ webhook_url: webhook })
        else onSave({ public_key: publicKey, secret_key: secretKey })
      }}
    >
      {id === 'amocrm' && (
        <>
          <label className={css.formLabel}>
            {t('amocrm.subdomain')}
            <Input value={subdomain} onChange={(event) => { setSubdomain(event.target.value) }} autoComplete="off" />
          </label>
          <label className={css.formLabel}>
            {t('amocrm.token')}
            <Input type="password" value={token} onChange={(event) => { setToken(event.target.value) }} autoComplete="off" />
          </label>
        </>
      )}
      {id === 'bitrix24' && (
        <label className={css.formLabel}>
          {t('bitrix24.webhook')}
          <Input value={webhook} onChange={(event) => { setWebhook(event.target.value) }} autoComplete="off" />
        </label>
      )}
      {id === 'tilda' && (
        <>
          <label className={css.formLabel}>
            {t('tilda.public')}
            <Input value={publicKey} onChange={(event) => { setPublicKey(event.target.value) }} autoComplete="off" />
          </label>
          <label className={css.formLabel}>
            {t('tilda.secret')}
            <Input type="password" value={secretKey} onChange={(event) => { setSecretKey(event.target.value) }} autoComplete="off" />
          </label>
        </>
      )}
      <div className={css.formRow}>
        <Button variant="primary" size="sm" type="submit">{t('save')}</Button>
        <Button variant="ghost" size="sm" type="button" onClick={onCancel}>{t('cancel')}</Button>
      </div>
    </form>
  )
}
