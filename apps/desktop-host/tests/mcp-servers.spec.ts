import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  mcpClientPatches, mcpServersPath, parseMcpServers, readMcpServers, removeMcpServer, upsertMcpServer, writeMcpServers,
} from '../src/mcp-servers.ts'

describe('mcp servers', () => {
  it('stores the list under DSH_HOME and mounts mcp-client rows', () => {
    const home = mkdtempSync(join(tmpdir(), 'mcp-'))
    const path = mcpServersPath({ DSH_HOME: home })
    expect(path).toBe(join(home, 'mcp-servers.json'))
    writeMcpServers(path, [
      { serverName: 'local', transport: 'stdio', command: 'npx', args: ['-y', 'srv'] },
      { serverName: 'web', transport: 'streamable-http', url: 'http://127.0.0.1:9/mcp' },
    ])
    expect(readMcpServers(path)).toEqual(parseMcpServers(JSON.parse(readFileSync(path, 'utf8'))))
    expect(mcpClientPatches(readMcpServers(path))).toEqual([
      {
        id: 'mcp-user-local',
        name: '@deepseek-ai/dsh-mcp-client',
        config: { transport: 'stdio', serverName: 'local', command: 'npx', args: ['-y', 'srv'] },
      },
      {
        id: 'mcp-user-web',
        name: '@deepseek-ai/dsh-mcp-client',
        config: { transport: 'streamable-http', serverName: 'web', url: 'http://127.0.0.1:9/mcp' },
      },
    ])
  })

  it('replaces a saved server and can remove it', () => {
    const first = { serverName: 'local', transport: 'stdio' as const, command: 'npx', args: ['a'] }
    const replaced = upsertMcpServer([first], { serverName: 'local', transport: 'streamable-http', url: 'http://127.0.0.1:9/mcp' })
    expect(replaced).toEqual([{ serverName: 'local', transport: 'streamable-http', url: 'http://127.0.0.1:9/mcp' }])
    expect(removeMcpServer(replaced, 'local')).toEqual([])
  })

  it('stores stdio env and hyphenated http headers', () => {
    const home = mkdtempSync(join(tmpdir(), 'mcp-env-'))
    const path = mcpServersPath({ DSH_HOME: home })
    writeMcpServers(path, [
      { serverName: 'local', transport: 'stdio', command: 'npx', args: [], env: { API_KEY: 'secret' } },
      {
        serverName: 'web',
        transport: 'streamable-http',
        url: 'https://example.test/mcp',
        headers: { Authorization: 'Bearer abc', 'X-Api-Key': 'k' },
      },
    ])
    expect(mcpClientPatches(readMcpServers(path))).toEqual([
      {
        id: 'mcp-user-local',
        name: '@deepseek-ai/dsh-mcp-client',
        config: { transport: 'stdio', serverName: 'local', command: 'npx', args: [], env: { API_KEY: 'secret' } },
      },
      {
        id: 'mcp-user-web',
        name: '@deepseek-ai/dsh-mcp-client',
        config: {
          transport: 'streamable-http',
          serverName: 'web',
          url: 'https://example.test/mcp',
          headers: { Authorization: 'Bearer abc', 'X-Api-Key': 'k' },
        },
      },
    ])
  })

  it('rejects a bad server name before writing', () => {
    expect(() => parseMcpServers([{ serverName: 'has space', transport: 'stdio', command: 'npx' }])).toThrow(/serverName/)
  })
})
