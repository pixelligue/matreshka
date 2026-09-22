/** Read name, description, and invocation from one SKILL.md document. */

/** Fields a pasted or imported SKILL.md contributes to the skill form. */
export interface ParsedSkillMarkdown {
  name?: string
  description?: string
  invocation: 'always' | 'manual'
  body: string
}

const FRONT = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/u

function unquote(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2)
    || (trimmed.startsWith('\'') && trimmed.endsWith('\'') && trimmed.length >= 2)
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

/**
 * Parse a SKILL.md document.
 * @param text - file text.
 * @returns the form fields, or `undefined` when the file has no frontmatter.
 */
export function parseSkillMarkdown(text: string): ParsedSkillMarkdown | undefined {
  const match = FRONT.exec(text)
  if (match === null) return undefined
  const front = match[1] ?? ''
  let name: string | undefined
  let description: string | undefined
  let invocation: ParsedSkillMarkdown['invocation'] = 'always'
  for (const line of front.split(/\r?\n/u)) {
    const row = /^([A-Za-z0-9-]+):\s*(.*)$/u.exec(line)
    if (row === null) continue
    const key = row[1]
    const value = unquote(row[2] ?? '')
    if (key === 'name' && value !== '') name = value
    if (key === 'description' && value !== '' && value !== '>' && value !== '|') description = value
    if (key === 'disable-model-invocation' && /^(?:true|yes|on|1)$/iu.test(value)) invocation = 'manual'
  }
  return {
    ...name === undefined ? {} : { name },
    ...description === undefined ? {} : { description },
    invocation,
    body: text.slice(match[0].length).trim(),
  }
}
