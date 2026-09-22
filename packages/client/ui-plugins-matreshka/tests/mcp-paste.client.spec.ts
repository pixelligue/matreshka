import { describe, expect, it } from 'vitest'
import { fillMcpSecret, parseMcpPaste } from '../src/client/mcp-paste.ts'
import { parseSkillMarkdown } from '../src/client/skill-markdown.ts'

describe('parseMcpPaste', () => {
  it('reads a Claude mcpServers document and asks for an empty key', () => {
    const [draft] = parseMcpPaste(JSON.stringify({
      mcpServers: {
        github: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-github'],
          env: { GITHUB_PERSONAL_ACCESS_TOKEN: '' },
        },
      },
    }))
    expect(draft?.serverName).toBe('github')
    expect(draft?.transport).toBe('stdio')
    expect(draft?.command).toBe('npx')
    expect(draft?.args).toEqual(['-y', '@modelcontextprotocol/server-github'])
    expect(draft?.secrets).toEqual([{ serverName: 'github', kind: 'env', key: 'GITHUB_PERSONAL_ACCESS_TOKEN' }])
    expect(draft?.env).toEqual({})
  })

  it('keeps a provided token and accepts an HTTP url', () => {
    const [draft] = parseMcpPaste(JSON.stringify({
      url: 'https://example.test/mcp',
      headers: { Authorization: 'Bearer real' },
    }))
    expect(draft?.transport).toBe('streamable-http')
    expect(draft?.headers).toEqual({ Authorization: 'Bearer real' })
    expect(draft?.secrets).toEqual([])
  })

  it('stores a filled secret on the draft', () => {
    const [draft] = parseMcpPaste(JSON.stringify({
      mcpServers: { local: { command: 'node', args: ['srv.js'], env: { API_KEY: '' } } },
    }))
    if (draft === undefined) throw new Error('expected a draft')
    const secret = draft.secrets[0]
    if (secret === undefined) throw new Error('expected a secret')
    expect(fillMcpSecret(draft, secret, 'abc').env).toEqual({ API_KEY: 'abc' })
  })

  it('reads a servers map', () => {
    const [draft] = parseMcpPaste(JSON.stringify({
      servers: { local: { command: 'node', args: ['srv.js'] } },
    }))
    expect(draft?.serverName).toBe('local')
    expect(draft?.command).toBe('node')
  })
})

describe('parseSkillMarkdown', () => {
  it('reads name, description, and manual invocation', () => {
    const parsed = parseSkillMarkdown('---\nname: demo-skill\ndescription: "Use this: often"\ndisable-model-invocation: true\n---\n\nDo the thing.\n')
    expect(parsed).toEqual({
      name: 'demo-skill',
      description: 'Use this: often',
      invocation: 'manual',
      body: 'Do the thing.',
    })
  })

  it('rejects a file without frontmatter', () => {
    expect(parseSkillMarkdown('# Just markdown')).toBeUndefined()
  })
})
