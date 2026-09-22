/**
 * User-owned MCP servers stored as JSON and mounted as mcp-client rows.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

const SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/u

/** One custom MCP server the operator asked Matreshka to connect. */
export interface McpServerRecord {
  serverName: string
  transport: 'stdio' | 'streamable-http'
  command?: string
  args?: string[]
  url?: string
  env?: Record<string, string>
  headers?: Record<string, string>
}

/** Cordis row that mounts one mcp-client instance. */
export interface McpClientPatch {
  id: string
  name: '@deepseek-ai/dsh-mcp-client'
  config: {
    transport: 'stdio' | 'streamable-http'
    serverName: string
    command?: string
    args?: string[]
    url?: string
    env?: Record<string, string>
    headers?: Record<string, string>
  }
}

/**
 * Absolute path of the operator's MCP server list.
 * @param env - process environment; `DSH_HOME` wins.
 * @param home - fallback home directory.
 * @returns the JSON file path.
 */
export function mcpServersPath(env: NodeJS.ProcessEnv = process.env, home: string = homedir()): string {
  const root = typeof env.DSH_HOME === 'string' && env.DSH_HOME.trim() !== ''
    ? env.DSH_HOME
    : join(home, '.matreshka')
  return join(root, 'mcp-servers.json')
}

const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/u
const HEADER_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/u

function stringRecord(value: unknown, label: string, namePattern: RegExp): Record<string, string> | undefined {
  if (value === undefined) return undefined
  const record = asRecord(value)
  const out: Record<string, string> = {}
  for (const [key, item] of Object.entries(record)) {
    if (!namePattern.test(key)) throw new Error(`${label} name "${key}" is invalid`)
    if (typeof item !== 'string') throw new Error(`${label} "${key}" must be a string`)
    out[key] = item
  }
  return Object.keys(out).length === 0 ? undefined : out
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('mcp server must be an object')
  }
  return value as Record<string, unknown>
}

/**
 * Validate a JSON value as the operator's MCP server list.
 * @param value - parsed JSON.
 * @returns the accepted servers.
 */
export function parseMcpServers(value: unknown): McpServerRecord[] {
  if (!Array.isArray(value)) throw new Error('mcp servers must be a list')
  const names = new Set<string>()
  return value.map((row): McpServerRecord => {
    const record = asRecord(row)
    const serverName = record.serverName
    if (typeof serverName !== 'string' || !SERVER_NAME.test(serverName)) {
      throw new Error('mcp serverName must match [A-Za-z0-9_-]{1,32}')
    }
    if (names.has(serverName)) throw new Error(`mcp serverName "${serverName}" is duplicated`)
    names.add(serverName)
    if (record.transport === 'stdio') {
      if (typeof record.command !== 'string' || record.command.trim() === '') {
        throw new Error(`mcp server "${serverName}" needs a command`)
      }
      const args = record.args === undefined ? [] : record.args
      if (!Array.isArray(args) || args.some(item => typeof item !== 'string')) {
        throw new Error(`mcp server "${serverName}" args must be strings`)
      }
      const env = stringRecord(record.env, 'env', ENV_NAME)
      return {
        serverName,
        transport: 'stdio',
        command: record.command,
        args,
        ...env === undefined ? {} : { env },
      }
    }
    if (record.transport === 'streamable-http') {
      if (typeof record.url !== 'string' || record.url.trim() === '') {
        throw new Error(`mcp server "${serverName}" needs a url`)
      }
      const headers = stringRecord(record.headers, 'header', HEADER_NAME)
      return {
        serverName,
        transport: 'streamable-http',
        url: record.url,
        ...headers === undefined ? {} : { headers },
      }
    }
    throw new Error(`mcp server "${serverName}" transport must be stdio or streamable-http`)
  })
}

/**
 * Read the server list. A missing file is an empty list.
 * @param path - JSON file path.
 * @returns validated servers.
 */
export function readMcpServers(path: string): McpServerRecord[] {
  let text: string
  try {
    text = readFileSync(path, 'utf8')
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return []
    throw error
  }
  return parseMcpServers(JSON.parse(text) as unknown)
}

/**
 * Replace the server list on disk.
 * @param path - JSON file path.
 * @param servers - servers to store after validation.
 */
export function writeMcpServers(path: string, servers: McpServerRecord[]): void {
  const accepted = parseMcpServers(servers)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(accepted, null, 2)}\n`)
}

/**
 * Replace one server in the list, or append it.
 * @param servers - current list.
 * @param next - server to store.
 * @returns the next list.
 */
export function upsertMcpServer(servers: readonly McpServerRecord[], next: McpServerRecord): McpServerRecord[] {
  const [accepted] = parseMcpServers([next])
  if (accepted === undefined) throw new Error('mcp server missing')
  return [...servers.filter(row => row.serverName !== accepted.serverName), accepted]
}

/**
 * Drop one server by name.
 * @param servers - current list.
 * @param serverName - name to remove.
 * @returns the next list.
 */
export function removeMcpServer(servers: readonly McpServerRecord[], serverName: string): McpServerRecord[] {
  return servers.filter(row => row.serverName !== serverName)
}

/**
 * Turn saved servers into mcp-client composition rows.
 * @param servers - validated servers.
 * @returns Cordis patch entries.
 */
export function mcpClientPatches(servers: readonly McpServerRecord[]): McpClientPatch[] {
  return servers.map((server): McpClientPatch => {
    if (server.transport === 'stdio') {
      const command = server.command
      if (command === undefined || command.trim() === '') {
        throw new Error(`mcp server "${server.serverName}" needs a command`)
      }
      return {
        id: `mcp-user-${server.serverName}`,
        name: '@deepseek-ai/dsh-mcp-client',
        config: {
          transport: 'stdio',
          serverName: server.serverName,
          command,
          args: server.args ?? [],
          ...server.env === undefined ? {} : { env: server.env },
        },
      }
    }
    const url = server.url
    if (url === undefined || url.trim() === '') {
      throw new Error(`mcp server "${server.serverName}" needs a url`)
    }
    return {
      id: `mcp-user-${server.serverName}`,
      name: '@deepseek-ai/dsh-mcp-client',
      config: {
        transport: 'streamable-http',
        serverName: server.serverName,
        url,
        ...server.headers === undefined ? {} : { headers: server.headers },
      },
    }
  })
}
