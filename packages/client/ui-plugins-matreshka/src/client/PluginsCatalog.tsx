import { useState } from 'react'
import { Button, Input, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { CONNECTABLE_IDS, PLUGIN_CARDS, isConnectable, type PluginId } from '../catalog.ts'
import type { CatalogSnapshot, ConnectFields, PluginStatus } from './api.ts'
import { NS, type PluginsKey } from './locales.ts'
import { PLUGIN_LOGO_SRC } from './logos.ts'
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
 * Render the four CIS plugin cards. Documents are not listed.
 * @param props - locale, catalog snapshot, and enable/connect callbacks.
 * @returns the catalog pane.
 */
export function PluginsCatalog({ t, useCatalog, enable, connect }: PluginsCatalogProps) {
  const snapshot = useCatalog(state => state)
  const [openId, setOpenId] = useState<PluginId | null>(null)
  return (
    <section className={css.pane} data-testid="plugins-catalog">
      <header className={css.header}>
        <h1 className={css.title}>{t('title')}</h1>
        {!snapshot.signedIn && <p className={css.notice}>{t('needSession')}</p>}
        {snapshot.error !== undefined && <p className={css.notice}>{t('requestFailed')}</p>}
      </header>
      <div className={css.grid}>
        {PLUGIN_CARDS.map((card) => {
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
                <Switch
                  checked={status.enabled}
                  onChange={(next) => { enable(card.title, next) }}
                  label={status.enabled ? t('disable') : t('enable')}
                  disabled={!snapshot.signedIn}
                />
              </div>
              {isConnectable(card.title) && (
                <p className={css.status}>
                  {status.connected ? t('connected') : t('disconnected')}
                </p>
              )}
              <div className={css.actions}>
                {isConnectable(card.title) && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!snapshot.signedIn}
                    onClick={() => { setOpenId(current => current === card.title ? null : card.title) }}
                  >
                    {t('connect')}
                  </Button>
                )}
              </div>
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
