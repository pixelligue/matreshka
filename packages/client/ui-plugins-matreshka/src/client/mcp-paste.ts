/** Turn a pasted MCP config into servers plus the secret fields still empty. */

const SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/u
const PLACEHOLDER = /^(?:|your[_-].*|changeme|todo|xxx|api[_-]?key|<.*>|\$\{.*\})$/iu

/** One server ready to save after the operator fills any empty secrets. */
export interface McpPasteDraft {
  serverName: string
  transport: 'stdio' | 'streamable-http'
  command?: string
  args?: string[]
  url?: string
  env: Record<string, string>
  headers: Record<string, string>
  secrets: readonly McpSecretField[]
}

/** One env or header value the paste left blank. */
export interface McpSecretField {
  serverName: string
  kind: 'env' | 'header'
  key: string
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

function strings(value: unknown): string[] | undefined {
  if (value === undefined) return []
  if (!Array.isArray(value)) return undefined
  const items: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') return undefined
    items.push(item)
  }
  return items
}

function needsSecret(value: string): boolean {
  return PLACEHOLDER.test(value.trim())
}

function serverNameOf(key: string, record: Record<string, unknown>): string {
  const named = typeof record.name === 'string' ? record.name : typeof record.serverName === 'string' ? record.serverName : key
  const clean = named.trim().replace(/[^A-Za-z0-9_-]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 32)
  return SERVER_NAME.test(clean) ? clean : 'server'
}

function draftFrom(name: string, record: Record<string, unknown>): McpPasteDraft | undefined {
  const args = strings(record.args)
  if (args === undefined) return undefined
  const envInput = asRecord(record.env) ?? {}
  const headerInput = asRecord(record.headers) ?? {}
  const env: Record<string, string> = {}
  const headers: Record<string, string> = {}
  const secrets: McpSecretField[] = []
  for (const [key, value] of Object.entries(envInput)) {
    if (typeof value !== 'string') continue
    if (needsSecret(value)) secrets.push({ serverName: name, kind: 'env', key })
    else env[key] = value
  }
  for (const [key, value] of Object.entries(headerInput)) {
    if (typeof value !== 'string') continue
    if (needsSecret(value)) secrets.push({ serverName: name, kind: 'header', key })
    else headers[key] = value
  }
  const url = typeof record.url === 'string' ? record.url.trim() : ''
  const command = typeof record.command === 'string' ? record.command.trim() : ''
  if (url !== '') {
    return { serverName: name, transport: 'streamable-http', url, env, headers, secrets }
  }
  if (command !== '') {
    return { serverName: name, transport: 'stdio', command, args, env, headers, secrets }
  }
  return undefined
}

function serversOf(value: unknown): Record<string, unknown> | undefined {
  const record = asRecord(value)
  if (record === undefined) return undefined
  const nested = asRecord(record.mcpServers)
  if (nested !== undefined) return nested
  if (record.command !== undefined || record.url !== undefined || record.transport !== undefined) {
    return { server: record }
  }
  const servers = asRecord(record.servers)
  if (servers !== undefined) return servers
  return record
}

/**
 * Parse a Claude, Cursor, or single-server MCP JSON document.
 * @param text - pasted config.
 * @returns one draft per recognized server.
 */
export function parseMcpPaste(text: string): McpPasteDraft[] {
  const parsed: unknown = JSON.parse(text)
  if (Array.isArray(parsed)) {
    return parsed.flatMap((item) => {
      const record = asRecord(item)
      if (record === undefined) return []
      const draft = draftFrom(serverNameOf('server', record), record)
      return draft === undefined ? [] : [draft]
    })
  }
  const servers = serversOf(parsed)
  if (servers === undefined) return []
  return Object.entries(servers).flatMap(([key, value]) => {
    const record = asRecord(value)
    if (record === undefined) return []
    const draft = draftFrom(serverNameOf(key, record), record)
    return draft === undefined ? [] : [draft]
  })
}

/**
 * Fill one detected secret and drop it from the pending list.
 * @param draft - parsed server.
 * @param field - secret the operator filled.
 * @param value - the value to store.
 * @returns the next draft.
 */
export function fillMcpSecret(draft: McpPasteDraft, field: McpSecretField, value: string): McpPasteDraft {
  const secrets = draft.secrets.filter(item => item.key !== field.key || item.kind !== field.kind)
  if (field.kind === 'env') return { ...draft, env: { ...draft.env, [field.key]: value }, secrets }
  return { ...draft, headers: { ...draft.headers, [field.key]: value }, secrets }
}
