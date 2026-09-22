/**
 * Fetch one public GitHub file for a skill or MCP paste.
 */

const MAX_CHARS = 200_000

/** Which file a repository-root import looks for. */
export type GithubImportKind = 'skill' | 'mcp'

/**
 * Raw GitHub URLs that might contain the imported file.
 * @param value - a github.com or raw.githubusercontent.com URL.
 * @param kind - `skill` looks for SKILL.md; `mcp` looks for an MCP JSON file.
 * @returns candidate raw URLs in try order.
 */
export function githubRawCandidates(value: string, kind: GithubImportKind): string[] {
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    throw new Error('import URL is not a GitHub link')
  }
  if (url.protocol !== 'https:') throw new Error('import URL must be https')
  if (url.hostname === 'raw.githubusercontent.com') return [url.toString()]
  if (url.hostname !== 'github.com') throw new Error('import URL must be a GitHub link')
  const parts = url.pathname.split('/').filter(part => part !== '')
  const owner = parts[0]
  const repo = parts[1]?.replace(/\.git$/u, '')
  if (owner === undefined || repo === undefined) throw new Error('import URL must include owner and repo')
  if (parts.length === 2) {
    const root = `https://raw.githubusercontent.com/${owner}/${repo}`
    if (kind === 'mcp') {
      return [
        `${root}/main/.mcp.json`,
        `${root}/master/.mcp.json`,
        `${root}/main/mcp.json`,
        `${root}/master/mcp.json`,
      ]
    }
    return [
      `${root}/main/SKILL.md`,
      `${root}/master/SKILL.md`,
    ]
  }
  if (parts[2] === 'blob' && parts.length >= 5) {
    const ref = parts[3]
    const path = parts.slice(4).join('/')
    return [`https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`]
  }
  throw new Error('import URL must be a repository or a file')
}

/**
 * Download the first reachable candidate.
 * @param value - operator-supplied GitHub URL.
 * @param kind - which repository-root file to try.
 * @returns the file text.
 */
export async function fetchGithubText(value: string, kind: GithubImportKind): Promise<string> {
  const candidates = githubRawCandidates(value, kind)
  let last = 'not found'
  for (const candidate of candidates) {
    const response = await fetch(candidate, { redirect: 'follow' })
    if (!response.ok) {
      last = String(response.status)
      continue
    }
    const finalUrl = new URL(response.url)
    if (finalUrl.protocol !== 'https:' || finalUrl.hostname !== 'raw.githubusercontent.com') {
      throw new Error('import redirected away from GitHub')
    }
    const text = await response.text()
    if (text.length > MAX_CHARS) throw new Error('imported file is too large')
    return text
  }
  throw new Error(`GitHub import failed (${last})`)
}
