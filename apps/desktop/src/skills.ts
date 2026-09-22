/**
 * Operator skills stored as SKILL.md under DSH_HOME or a project.
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join } from 'node:path'

const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

/** One skill the operator added from the Plugins page. */
export interface SkillRecord {
  name: string
  description: string
  body: string
  invocation: 'always' | 'manual'
  enabled: boolean
  projectPath?: string
}

/**
 * Absolute path of the operator skill index.
 * @param env - process environment; `DSH_HOME` wins.
 * @param home - fallback home directory.
 * @returns the JSON file path.
 */
export function skillsIndexPath(env: NodeJS.ProcessEnv = process.env, home: string = homedir()): string {
  const root = typeof env.DSH_HOME === 'string' && env.DSH_HOME.trim() !== ''
    ? env.DSH_HOME
    : join(home, '.matreshka')
  return join(root, 'skills.json')
}

/**
 * Directory that receives one materialized skill.
 * @param record - skill to place.
 * @param env - process environment.
 * @param home - fallback home directory.
 * @returns the skill directory.
 */
export function skillDirectory(
  record: SkillRecord,
  env: NodeJS.ProcessEnv = process.env,
  home: string = homedir(),
): string {
  const root = record.projectPath !== undefined && record.projectPath.trim() !== ''
    ? record.projectPath
    : (typeof env.DSH_HOME === 'string' && env.DSH_HOME.trim() !== '' ? env.DSH_HOME : join(home, '.matreshka'))
  const folder = record.projectPath !== undefined && record.projectPath.trim() !== ''
    ? join(root, '.dsh', 'skills', record.name)
    : join(root, 'skills', record.name)
  return folder
}

function yamlScalar(value: string): string {
  return JSON.stringify(value.replace(/\s+/gu, ' ').trim())
}

/**
 * Render one SKILL.md document.
 * @param record - skill fields.
 * @returns the file text.
 */
export function skillDocument(record: SkillRecord): string {
  const manual = record.invocation === 'manual' ? '\ndisable-model-invocation: true' : ''
  return `---\nname: ${record.name}\ndescription: ${yamlScalar(record.description)}${manual}\n---\n\n${record.body.trim()}\n`
}

function skillPlace(record: SkillRecord): string {
  return `${record.projectPath ?? ''}\0${record.name}`
}

function previousSkills(indexPath: string): SkillRecord[] {
  try {
    return readSkills(indexPath)
  } catch (error: unknown) {
    // A corrupt index does not identify directories from an older save.
    if (error instanceof Error && !('code' in error)) return []
    throw error
  }
}

/**
 * Validate the operator skill index.
 * @param value - parsed JSON.
 * @returns accepted skills.
 */
export function parseSkills(value: unknown): SkillRecord[] {
  if (!Array.isArray(value)) throw new Error('skills must be a list')
  const names = new Set<string>()
  return value.map((row): SkillRecord => {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) throw new Error('skill must be an object')
    const record = row as Record<string, unknown>
    const name = record.name
    if (typeof name !== 'string' || !SKILL_NAME.test(name) || name.length > 64) {
      throw new Error('skill name must be kebab-case')
    }
    if (names.has(name)) throw new Error(`skill "${name}" is duplicated`)
    names.add(name)
    if (typeof record.description !== 'string' || record.description.trim() === '') {
      throw new Error(`skill "${name}" needs a description`)
    }
    if (typeof record.body !== 'string') throw new Error(`skill "${name}" needs a body`)
    if (record.body.length > 200_000) throw new Error(`skill "${name}" is too large`)
    if (record.invocation !== 'always' && record.invocation !== 'manual') {
      throw new Error(`skill "${name}" invocation must be always or manual`)
    }
    if (typeof record.enabled !== 'boolean') throw new Error(`skill "${name}" enabled must be boolean`)
    const projectPath = record.projectPath
    if (projectPath !== undefined && (typeof projectPath !== 'string' || (projectPath.trim() !== '' && !isAbsolute(projectPath)))) {
      throw new Error(`skill "${name}" project path must be absolute`)
    }
    return {
      name,
      description: record.description.trim(),
      body: record.body,
      invocation: record.invocation,
      enabled: record.enabled,
      ...typeof projectPath === 'string' && projectPath.trim() !== '' ? { projectPath: projectPath.trim() } : {},
    }
  })
}

/**
 * Read the skill index. A missing file is an empty list.
 * @param path - JSON file path.
 * @returns validated skills.
 */
export function readSkills(path: string): SkillRecord[] {
  try {
    return parseSkills(JSON.parse(readFileSync(path, 'utf8')) as unknown)
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return []
    throw error
  }
}

/**
 * Store the index and write or remove each SKILL.md.
 * @param indexPath - JSON file path.
 * @param skills - skills to store.
 * @param env - process environment used to place user skills.
 * @param home - fallback home directory.
 */
export function writeSkills(
  indexPath: string,
  skills: SkillRecord[],
  env: NodeJS.ProcessEnv = process.env,
  home: string = homedir(),
): void {
  const accepted = parseSkills(skills)
  const previous = previousSkills(indexPath)
  mkdirSync(dirname(indexPath), { recursive: true })
  writeFileSync(indexPath, `${JSON.stringify(accepted, null, 2)}\n`)
  const live = new Set(accepted.filter(skill => skill.enabled).map(skill => skillPlace(skill)))
  for (const skill of accepted) {
    const directory = skillDirectory(skill, env, home)
    if (!skill.enabled) {
      rmSync(directory, { recursive: true, force: true })
      continue
    }
    mkdirSync(directory, { recursive: true })
    writeFileSync(join(directory, 'SKILL.md'), skillDocument(skill))
  }
  for (const old of previous) {
    if (live.has(skillPlace(old))) continue
    rmSync(skillDirectory(old, env, home), { recursive: true, force: true })
  }
}
