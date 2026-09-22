/** Custom MCP servers on the Plugins page. Desktop persists them and connects on the next launch. */

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives'
import { desktopPageBridge, type DesktopMcpServer } from './desktop-bridge.ts'
import type { PluginsKey } from './locales.ts'
import { fillMcpSecret, parseMcpPaste, type McpPasteDraft, type McpSecretField } from './mcp-paste.ts'
import css from './McpServers.module.css'

const SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/u

function secretId(serverName: string, field: McpSecretField): string {
  return `${serverName}\n${field.kind}\n${field.key}`
}

function readPaste(text: string): McpPasteDraft[] {
  const parsed = parseMcpPaste(text)
  if (parsed.length === 0) throw new Error('mcp paste has no servers')
  return parsed
}

function tryParse(text: string): McpPasteDraft[] | undefined {
  try {
    return readPaste(text)
  } catch (error: unknown) {
    // A half-typed paste is not a notice. Detect reports a finished document that still fails.
    if (error instanceof Error) return undefined
    return undefined
  }
}

function withSecrets(
  drafts: readonly McpPasteDraft[],
  values: Readonly<Record<string, string>>,
): McpPasteDraft[] | undefined {
  const next: McpPasteDraft[] = []
  for (const draft of drafts) {
    let current = draft
    for (const field of draft.secrets) {
      const value = values[secretId(draft.serverName, field)]?.trim() ?? ''
      if (value === '') return undefined
      current = fillMcpSecret(current, field, value)
    }
    next.push(current)
  }
  return next
}

function draftToServer(draft: McpPasteDraft): DesktopMcpServer {
  if (draft.transport === 'stdio') {
    return {
      serverName: draft.serverName,
      transport: 'stdio',
      command: draft.command ?? '',
      args: draft.args ?? [],
      ...Object.keys(draft.env).length === 0 ? {} : { env: draft.env },
    }
  }
  return {
    serverName: draft.serverName,
    transport: 'streamable-http',
    url: draft.url ?? '',
    ...Object.keys(draft.headers).length === 0 ? {} : { headers: draft.headers },
  }
}

function mergeServers(servers: readonly DesktopMcpServer[], drafts: readonly McpPasteDraft[]): DesktopMcpServer[] {
  const added = drafts.map(draftToServer)
  const names = new Set(added.map(row => row.serverName))
  return [...servers.filter(row => !names.has(row.serverName)), ...added]
}

/**
 * List, paste, and import custom MCP servers.
 * @param props.t - plugins locale.
 * @param props.query - catalog search text.
 * @param props.formOpen - whether the add form is open.
 * @param props.onDismiss - called after a successful save so the page can close the form.
 * @param props.onListed - saved server names for the installed row.
 * @returns the MCP section.
 */
export function McpServers({
  t,
  query = '',
  formOpen = false,
  onDismiss,
  onListed,
}: {
  t: (key: PluginsKey) => string
  query?: string
  formOpen?: boolean
  onDismiss?: () => void
  onListed?: (names: readonly string[]) => void
}): ReactNode {
  const page = desktopPageBridge()
  const bridge = page?.mcp
  const [servers, setServers] = useState<DesktopMcpServer[]>([])
  const [paste, setPaste] = useState('')
  const [drafts, setDrafts] = useState<McpPasteDraft[]>([])
  const [secretValues, setSecretValues] = useState<Record<string, string>>({})
  const [githubUrl, setGithubUrl] = useState('')
  const [name, setName] = useState('')
  const [kind, setKind] = useState<'stdio' | 'streamable-http'>('stdio')
  const [command, setCommand] = useState('')
  const [args, setArgs] = useState('')
  const [url, setUrl] = useState('')
  const [notice, setNotice] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (bridge === undefined) return
    void bridge.list().then(setServers).catch(() => { setNotice(t('mcpInvalid')) })
  }, [bridge, t])
  useEffect(() => {
    onListed?.(servers.map(server => server.serverName))
  }, [servers, onListed])

  if (bridge === undefined) {
    return (
      <section className={css.section} data-testid="mcp-servers">
        <h2 className={css.title}>{t('mcpTitle')}</h2>
        <p className={css.hint}>{t('mcpUnavailable')}</p>
      </section>
    )
  }

  const showDrafts = (next: McpPasteDraft[]): void => {
    setDrafts(next)
    setSecretValues({})
    setNotice(t('mcpParsed'))
  }

  const onPaste = (value: string): void => {
    setPaste(value)
    if (value.trim() === '') {
      setDrafts([])
      setSecretValues({})
      return
    }
    const parsed = tryParse(value)
    if (parsed !== undefined) showDrafts(parsed)
  }

  const detect = (): void => {
    let parsed: McpPasteDraft[]
    try {
      parsed = readPaste(paste)
    } catch (error: unknown) {
      // The page shows mcpParseFailed. The thrown text stays off the pane.
      if (error instanceof Error) setNotice(t('mcpParseFailed'))
      return
    }
    showDrafts(parsed)
  }

  const importGithub = (): void => {
    const load = page?.importGithub
    if (load === undefined) {
      setNotice(t('mcpImportFailed'))
      return
    }
    void load(githubUrl, 'mcp').then((text) => {
      setPaste(text)
      setGithubUrl('')
      const parsed = tryParse(text)
      if (parsed === undefined) {
        setNotice(t('mcpParseFailed'))
        return
      }
      showDrafts(parsed)
    }).catch(() => { setNotice(t('mcpImportFailed')) })
  }

  const add = (): void => {
    const serverName = name.trim()
    if (!SERVER_NAME.test(serverName)) {
      setNotice(t('mcpInvalid'))
      return
    }
    const next: DesktopMcpServer = kind === 'stdio'
      ? { serverName, transport: 'stdio', command: command.trim(), args: args.trim() === '' ? [] : args.trim().split(/\s+/u) }
      : { serverName, transport: 'streamable-http', url: url.trim() }
    if (next.transport === 'stdio' && next.command === '') {
      setNotice(t('mcpInvalid'))
      return
    }
    if (next.transport === 'streamable-http' && next.url === '') {
      setNotice(t('mcpInvalid'))
      return
    }
    setServers(current => [...current.filter(row => row.serverName !== serverName), next])
    setName('')
    setCommand('')
    setArgs('')
    setUrl('')
    setNotice(undefined)
  }

  const save = (): void => {
    const ready = withSecrets(drafts, secretValues)
    if (ready === undefined) {
      setNotice(t('mcpSecret'))
      return
    }
    const next = mergeServers(servers, ready)
    void bridge.save(next).then(() => {
      setServers(next)
      setDrafts([])
      setPaste('')
      setSecretValues({})
      onDismiss?.()
      setNotice(t('mcpSaved'))
    }).catch(() => { setNotice(t('mcpInvalid')) })
  }

  const remove = (serverName: string): void => {
    const next = servers.filter(row => row.serverName !== serverName)
    setServers(next)
    void bridge.save(next).then(() => { setNotice(t('mcpSaved')) }).catch(() => { setNotice(t('mcpInvalid')) })
  }

  const needle = query.trim().toLowerCase()
  const visible = needle === ''
    ? servers
    : servers.filter(server => server.serverName.toLowerCase().includes(needle)
      || (server.command ?? '').toLowerCase().includes(needle)
      || (server.url ?? '').toLowerCase().includes(needle))
  if (needle !== '' && visible.length === 0 && !formOpen) return null

  return (
    <section className={css.section} id="plugins-mcp" data-testid="mcp-servers">
      {visible.length > 0 && <p className={css.hint}>{t('mcpHint')}</p>}
      {visible.length === 0
        ? <p className={css.hint}>{t('mcpEmpty')}</p>
        : (
          <ul className={css.list}>
            {visible.map(server => (
              <li key={server.serverName} className={css.row}>
                <span className={css.name}>{server.serverName}</span>
                <span className={css.detail}>
                  {server.transport === 'stdio' ? server.command : server.url}
                </span>
                <button
                  type="button"
                  className={css.remove}
                  onClick={() => { remove(server.serverName) }}
                >
                  {t('mcpRemove')}
                </button>
              </li>
            ))}
          </ul>
        )}
      {notice !== undefined && <p className={css.hint}>{notice}</p>}
      {formOpen && (
        <div className={css.form}>
          <label className={css.field}>
            {t('mcpPaste')}
            <textarea className={css.area} value={paste} onChange={(event) => { onPaste(event.target.value) }} spellCheck={false} />
          </label>
          <div className={css.actions}>
            <Button type="button" variant="outline" size="sm" onClick={detect}>{t('mcpParse')}</Button>
          </div>
          {drafts.map(draft => (
            <div key={draft.serverName} className={css.form}>
              <p className={css.hint}>{draft.serverName}</p>
              <p className={css.detail}>{draft.transport === 'stdio' ? draft.command : draft.url}</p>
              {draft.secrets.map((field) => {
                const id = secretId(draft.serverName, field)
                return (
                  <label key={id} className={css.field}>
                    <span>{t('mcpSecret')}</span>
                    {' '}
                    <span>{field.kind}</span>
                    {' '}
                    <span>{field.key}</span>
                    <Input
                      type="password"
                      value={secretValues[id] ?? ''}
                      onChange={(event) => { setSecretValues(current => ({ ...current, [id]: event.target.value })) }}
                      autoComplete="off"
                    />
                  </label>
                )
              })}
            </div>
          ))}
          <label className={css.field}>
            {t('mcpImportUrl')}
            <Input value={githubUrl} onChange={(event) => { setGithubUrl(event.target.value) }} autoComplete="off" />
          </label>
          <div className={css.actions}>
            <Button type="button" variant="outline" size="sm" onClick={importGithub}>{t('mcpImport')}</Button>
          </div>
          <label className={css.field}>
            {t('mcpName')}
            <Input value={name} onChange={(event) => { setName(event.target.value) }} autoComplete="off" />
          </label>
          <label className={css.field}>
            {t('mcpKind')}
            <select className={css.select} value={kind} onChange={(event) => { setKind(event.target.value as 'stdio' | 'streamable-http') }}>
              <option value="stdio">stdio</option>
              <option value="streamable-http">HTTP</option>
            </select>
          </label>
          {kind === 'stdio'
            ? (
              <>
                <label className={css.field}>
                  {t('mcpCommand')}
                  <Input value={command} onChange={(event) => { setCommand(event.target.value) }} autoComplete="off" />
                </label>
                <label className={css.field}>
                  {t('mcpArgs')}
                  <Input value={args} onChange={(event) => { setArgs(event.target.value) }} autoComplete="off" />
                </label>
              </>
            )
            : (
              <label className={css.field}>
                {t('mcpUrl')}
                <Input value={url} onChange={(event) => { setUrl(event.target.value) }} autoComplete="off" />
              </label>
            )}
          <div className={css.actions}>
            <Button type="button" variant="outline" size="sm" onClick={add}>{t('mcpAdd')}</Button>
            <Button type="button" variant="primary" size="sm" onClick={save}>{t('mcpSave')}</Button>
          </div>
        </div>
      )}
    </section>
  )
}
