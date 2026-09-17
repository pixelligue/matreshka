/** Session header spacing: the title is the flex primary beside trailing chrome. */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(fileURLToPath(new URL('../src/client/skeleton/ConversationRoot.module.css', import.meta.url)), 'utf8')

/**
 * Declarations of one selector rule, keyed by property.
 * @param selector - exact selector text.
 * @returns the rule's declarations, or undefined when absent.
 */
function declarations(selector: string): Map<string, string> | undefined {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, ' ')
  const found = new Map<string, string>()
  for (const [, selectorList = '', body = ''] of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selectorList.split(',').map(value => value.trim()).includes(selector)) continue
    for (const part of body.split(';')) {
      const colon = part.indexOf(':')
      if (colon === -1) continue
      found.set(part.slice(0, colon).trim(), part.slice(colon + 1).trim().replace(/\s+/g, ' '))
    }
  }
  return found.size === 0 ? undefined : found
}

describe('Conversation session header', () => {
  it('gives the title cluster room and keeps actions from shrinking the title away', () => {
    expect(declarations('.titleCluster')?.get('min-width')).toBe('0')
    expect(declarations('.crumbs')?.get('flex')).toBe('1')
    expect(declarations('.crumbs')?.get('min-width')).toBe('0')
    expect(declarations('.crumb')?.get('text-overflow')).toBe('ellipsis')
    expect(declarations('.crumbCurrent')?.get('min-width')).toBe('0')
    expect(declarations('.crumbCurrent')?.get('max-width')).toBe('none')
    expect(declarations('.headerActions')?.get('flex-shrink')).toBe('0')
  })
})
