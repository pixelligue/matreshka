/** Desktop bridge for the Plugins page. The web catalog has no `dshDesktop`. */

/** One MCP server the desktop bridge stores. */
export interface DesktopMcpServer {
  serverName: string
  transport: 'stdio' | 'streamable-http'
  command?: string
  args?: string[]
  url?: string
  env?: Record<string, string>
  headers?: Record<string, string>
}

/** One operator skill the desktop bridge stores. */
export interface DesktopSkillRecord {
  name: string
  description: string
  body: string
  invocation: 'always' | 'manual'
  enabled: boolean
  projectPath?: string
}

/** The slice of `dshDesktop` this page calls. */
export interface DesktopPageBridge {
  mcp?: {
    list(): Promise<DesktopMcpServer[]>
    save(servers: DesktopMcpServer[]): Promise<void>
  }
  skills?: {
    list(): Promise<DesktopSkillRecord[]>
    save(skills: DesktopSkillRecord[]): Promise<void>
  }
  importGithub?: (url: string, kind: 'skill' | 'mcp') => Promise<string>
}

/**
 * Read the application-document bridge when this page is running in Desktop.
 * @returns the bridge, or `undefined` in the web catalog.
 */
export function desktopPageBridge(): DesktopPageBridge | undefined {
  return (globalThis as { dshDesktop?: DesktopPageBridge }).dshDesktop
}
