import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { parseSkills, readSkills, skillsIndexPath, writeSkills } from '../src/skills.ts'

it('writes enabled skills and deletes a skill that leaves the index', () => {
  const home = mkdtempSync(join(tmpdir(), 'skills-'))
  const project = mkdtempSync(join(tmpdir(), 'skill-project-'))
  try {
    const env = { DSH_HOME: home }
    const index = skillsIndexPath(env)
    const always = {
      name: 'always-on',
      description: 'Use this: always',
      body: 'Steps.',
      invocation: 'always' as const,
      enabled: true,
    }
    const manual = {
      name: 'named-only',
      description: 'Only when named',
      body: 'Hidden.',
      invocation: 'manual' as const,
      enabled: true,
      projectPath: project,
    }
    writeSkills(index, [always, manual], env)
    expect(readFileSync(join(home, 'skills', 'always-on', 'SKILL.md'), 'utf8')).toContain('"Use this: always"')
    expect(readFileSync(join(project, '.dsh', 'skills', 'named-only', 'SKILL.md'), 'utf8')).toContain('disable-model-invocation: true')
    writeSkills(index, [always, { ...manual, enabled: false }], env)
    expect(existsSync(join(project, '.dsh', 'skills', 'named-only', 'SKILL.md'))).toBe(false)
    expect(readSkills(index).map(skill => skill.name)).toEqual(['always-on', 'named-only'])
    writeSkills(index, [always], env)
    expect(existsSync(join(home, 'skills', 'always-on', 'SKILL.md'))).toBe(true)
    writeSkills(index, [], env)
    expect(existsSync(join(home, 'skills', 'always-on'))).toBe(false)
    expect(readSkills(index)).toEqual([])
  } finally {
    rmSync(home, { recursive: true, force: true })
    rmSync(project, { recursive: true, force: true })
  }
})

it('rejects a skill name that is not kebab-case', () => {
  expect(() => parseSkills([{
    name: 'Bad Name',
    description: 'Demo',
    body: 'Body',
    invocation: 'always',
    enabled: true,
  }])).toThrow(/kebab-case/)
})
