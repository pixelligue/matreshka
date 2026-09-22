/**
 * Chat tools that connect a custom MCP server in the running Desktop host.
 */

import type { Context, Fiber } from '@deepseek-ai/cordis'
import { apply as connectMcpServer, name as mcpClientName, type Config as McpConfig } from '@deepseek-ai/dsh-mcp-client'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-tools'
import {
  mcpServersPath, readMcpServers, removeMcpServer, upsertMcpServer, writeMcpServers,
  type McpServerRecord,
} from './mcp-servers.ts'

const mcpClientPlugin = { name: mcpClientName, inject: ['tools'] as const, apply: connectMcpServer }

function text(message: string): { message: string } {
  return { message }
}

function recordFromArgs(args: {
  serverName?: string
  transport?: string
  command?: string
  args?: string[]
  url?: string
}): McpServerRecord {
  const serverName = args.serverName ?? ''
  if (args.transport === 'stdio') {
    return { serverName, transport: 'stdio', command: args.command ?? '', args: args.args ?? [] }
  }
  return { serverName, transport: 'streamable-http', url: args.url ?? '' }
}

function pluginConfig(server: McpServerRecord): McpConfig {
  if (server.transport === 'stdio') {
    const command = server.command
    if (command === undefined || command.trim() === '') throw new Error(`mcp server "${server.serverName}" needs a command`)
    return {
      transport: 'stdio',
      serverName: server.serverName,
      command,
      args: server.args ?? [],
      env: server.env ?? {},
      cwd: '',
      toolCallTimeoutMs: 60_000,
      failOnStartupError: false,
    }
  }
  const url = server.url
  if (url === undefined || url.trim() === '') throw new Error(`mcp server "${server.serverName}" needs a url`)
  return {
    transport: 'streamable-http',
    serverName: server.serverName,
    url,
    headers: server.headers ?? {},
    toolCallTimeoutMs: 60_000,
    failOnStartupError: false,
  }
}

/**
 * Register connect_mcp, list_mcp, and disconnect_mcp on the host tool registry.
 * @param ctx - desktop host context after the plugin tree has loaded.
 */
export function registerMcpChatTools(ctx: Context): void {
  const tools = ctx.tools
  const started = new Map<string, Fiber>()
  let chain = Promise.resolve()
  const enqueue = <T>(job: () => Promise<T>): Promise<T> => {
    const run = chain.then(job, job)
    chain = run.then(() => undefined, () => undefined)
    return run
  }

  tools.register(defineTool({
    name: 'connect_mcp',
    description: 'Connect a custom MCP server for this operator and save it. stdio runs a local command. streamable-http uses a URL. Tools from the server are available on the next turn. Do not use for built-in plugins.',
    parameters: {
      serverName: { type: 'string', required: true, description: 'Short name, [A-Za-z0-9_-]{1,32}.' },
      transport: { type: 'string', required: true, description: 'stdio or streamable-http.' },
      command: { type: 'string', description: 'Executable for stdio, such as npx.' },
      args: { type: 'array', items: { type: 'string' }, description: 'Arguments for the stdio command.' },
      url: { type: 'string', description: 'Endpoint URL for streamable-http.' },
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { message: { type: 'string', required: true } } },
      render: (_args, value) => [{ type: 'text', text: value.message }],
    },
    isConcurrencySafe: () => false,
    async execute(args) {
      return enqueue(async () => {
        const next = upsertMcpServer(readMcpServers(mcpServersPath()), recordFromArgs(args))
        const saved = next.find(row => row.serverName === args.serverName)
        if (saved === undefined) return text('Could not save that MCP server.')
        if (started.has(saved.serverName)) return text(`${saved.serverName} is already connected.`)
        try {
          const fiber = await ctx.plugin(mcpClientPlugin, pluginConfig(saved))
          started.set(saved.serverName, fiber)
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error)
          if (message.includes('already in use')) return text(`${saved.serverName} is already connected.`)
          return text(message)
        }
        writeMcpServers(mcpServersPath(), next)
        return text(`Connected ${saved.serverName}. Its tools are available on the next turn.`)
      })
    },
  }))

  tools.register(defineTool({
    name: 'list_mcp',
    description: 'List custom MCP servers saved for this operator.',
    parameters: {},
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { message: { type: 'string', required: true } } },
      render: (_args, value) => [{ type: 'text', text: value.message }],
    },
    isConcurrencySafe: () => true,
    async execute() {
      const servers = readMcpServers(mcpServersPath())
      if (servers.length === 0) return text('No custom MCP servers are saved.')
      return text(servers.map(server => `${server.serverName} ${server.transport} ${server.command ?? server.url ?? ''}`).join('\n'))
    },
  }))

  tools.register(defineTool({
    name: 'disconnect_mcp',
    description: 'Remove a custom MCP server saved for this operator. A server connected from this chat stops now. A server loaded at startup stops after Matreshka restarts.',
    parameters: {
      serverName: { type: 'string', required: true, description: 'serverName passed to connect_mcp.' },
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { message: { type: 'string', required: true } } },
      render: (_args, value) => [{ type: 'text', text: value.message }],
    },
    isConcurrencySafe: () => false,
    async execute(args) {
      return enqueue(async () => {
        const name = args.serverName ?? ''
        const current = readMcpServers(mcpServersPath())
        if (!current.some(row => row.serverName === name)) return text(`${name} is not a saved MCP server.`)
        writeMcpServers(mcpServersPath(), removeMcpServer(current, name))
        const fiber = started.get(name)
        if (fiber !== undefined) {
          started.delete(name)
          await fiber.dispose()
          return text(`Disconnected ${name}.`)
        }
        return text(`Removed ${name}. Restart Matreshka to drop tools that were loaded at startup.`)
      })
    },
  }))
}
