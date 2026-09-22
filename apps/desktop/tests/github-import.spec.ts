import { expect, it } from 'vitest'
import { githubRawCandidates } from '../src/github-import.ts'

it('maps a repository URL to a skill or an MCP file', () => {
  expect(githubRawCandidates('https://github.com/acme/demo', 'skill')).toEqual([
    'https://raw.githubusercontent.com/acme/demo/main/SKILL.md',
    'https://raw.githubusercontent.com/acme/demo/master/SKILL.md',
  ])
  expect(githubRawCandidates('https://github.com/acme/demo.git', 'mcp')).toEqual([
    'https://raw.githubusercontent.com/acme/demo/main/.mcp.json',
    'https://raw.githubusercontent.com/acme/demo/master/.mcp.json',
    'https://raw.githubusercontent.com/acme/demo/main/mcp.json',
    'https://raw.githubusercontent.com/acme/demo/master/mcp.json',
  ])
  expect(githubRawCandidates('https://github.com/acme/demo/blob/v1/skills/a/SKILL.md', 'mcp')).toEqual([
    'https://raw.githubusercontent.com/acme/demo/v1/skills/a/SKILL.md',
  ])
})

it('rejects a non-https GitHub link', () => {
  expect(() => githubRawCandidates('http://github.com/acme/demo', 'skill')).toThrow(/https/)
})
