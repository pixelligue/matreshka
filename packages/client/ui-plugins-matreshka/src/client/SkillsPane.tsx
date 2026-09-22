/** Operator skills on the Plugins page. Desktop writes each enabled skill as SKILL.md. */

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Button, Input, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import { desktopPageBridge, type DesktopSkillRecord } from './desktop-bridge.ts'
import type { PluginsKey } from './locales.ts'
import { parseSkillMarkdown } from './skill-markdown.ts'
import css from './McpServers.module.css'

const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

function absoluteProject(path: string): boolean {
  return path.startsWith('/') || path.startsWith('\\\\') || /^[A-Za-z]:[\\/]/u.test(path)
}

/**
 * List, write, and import operator skills.
 * @param props.t - plugins locale.
 * @param props.query - catalog search text.
 * @param props.formOpen - whether the add form is open.
 * @param props.onDismiss - called after a successful save so the page can close the form.
 * @param props.onListed - enabled skill names for the installed row.
 * @returns the skills section.
 */
export function SkillsPane({
  t,
  query = '',
  formOpen = false,
  onDismiss,
  onListed,
}: {
  t: (key: PluginsKey) => string
  query?: string
  formOpen?: boolean
  onDismiss?: () => void
  onListed?: (names: readonly string[]) => void
}): ReactNode {
  const page = desktopPageBridge()
  const bridge = page?.skills
  const [skills, setSkills] = useState<DesktopSkillRecord[]>([])
  const [editing, setEditing] = useState<string | undefined>(undefined)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [body, setBody] = useState('')
  const [invocation, setInvocation] = useState<DesktopSkillRecord['invocation']>('always')
  const [project, setProject] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [githubUrl, setGithubUrl] = useState('')
  const [notice, setNotice] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (bridge === undefined) return
    void bridge.list().then(setSkills).catch(() => { setNotice(t('skillsInvalid')) })
  }, [bridge, t])
  useEffect(() => {
    onListed?.(skills.filter(skill => skill.enabled).map(skill => skill.name))
  }, [skills, onListed])

  if (bridge === undefined) {
    return (
      <section className={css.section} data-testid="skills-pane">
        <h2 className={css.title}>{t('skillsTitle')}</h2>
        <p className={css.hint}>{t('skillsUnavailable')}</p>
      </section>
    )
  }

  const load = (skill: DesktopSkillRecord): void => {
    setEditing(skill.name)
    setName(skill.name)
    setDescription(skill.description)
    setBody(skill.body)
    setInvocation(skill.invocation)
    setProject(skill.projectPath ?? '')
    setEnabled(skill.enabled)
    setNotice(undefined)
  }

  const blankForm = name.trim() === '' && description.trim() === '' && body.trim() === '' && project.trim() === ''

  const recordFromForm = (): DesktopSkillRecord | undefined => {
    const skillName = name.trim()
    const projectPath = project.trim()
    if (!SKILL_NAME.test(skillName) || skillName.length > 64 || description.trim() === '') {
      setNotice(t('skillsInvalid'))
      return undefined
    }
    if (projectPath !== '' && !absoluteProject(projectPath)) {
      setNotice(t('skillsInvalid'))
      return undefined
    }
    return {
      name: skillName,
      description: description.trim(),
      body,
      invocation,
      enabled,
      ...projectPath === '' ? {} : { projectPath },
    }
  }

  const remember = (record: DesktopSkillRecord): DesktopSkillRecord[] => {
    const next = [
      ...skills.filter(row => row.name !== record.name && row.name !== editing),
      record,
    ]
    setSkills(next)
    setEditing(undefined)
    setName('')
    setDescription('')
    setBody('')
    setProject('')
    setInvocation('always')
    setEnabled(true)
    setNotice(undefined)
    return next
  }

  const add = (): void => {
    const record = recordFromForm()
    if (record === undefined) return
    remember(record)
  }

  const save = (): void => {
    let next = skills
    if (!blankForm) {
      const record = recordFromForm()
      if (record === undefined) return
      next = remember(record)
    }
    void bridge.save(next).then(() => {
      onDismiss?.()
      setNotice(t('skillsSaved'))
    }).catch(() => { setNotice(t('skillsInvalid')) })
  }

  const importGithub = (): void => {
    const loadFile = page?.importGithub
    if (loadFile === undefined) {
      setNotice(t('skillsImportFailed'))
      return
    }
    void loadFile(githubUrl, 'skill').then((text) => {
      const parsed = parseSkillMarkdown(text)
      if (parsed === undefined) {
        setNotice(t('skillsImportFailed'))
        return
      }
      setGithubUrl('')
      setName(parsed.name ?? '')
      setDescription(parsed.description ?? '')
      setBody(parsed.body)
      setInvocation(parsed.invocation)
      setNotice(undefined)
    }).catch(() => { setNotice(t('skillsImportFailed')) })
  }

  const needle = query.trim().toLowerCase()
  const visible = needle === ''
    ? skills
    : skills.filter(skill => skill.name.includes(needle) || skill.description.toLowerCase().includes(needle))
  if (needle !== '' && visible.length === 0 && !formOpen) return null

  return (
    <section className={css.section} id="plugins-skills" data-testid="skills-pane">
      {visible.length > 0 && <p className={css.hint}>{t('skillsHint')}</p>}
      {visible.length === 0
        ? <p className={css.hint}>{t('skillsEmpty')}</p>
        : (
          <ul className={css.list}>
            {visible.map(skill => (
              <li key={skill.name} className={css.row}>
                <button type="button" className={css.nameButton} onClick={() => { load(skill) }}>
                  {skill.name}
                </button>
                <span className={css.detail}>{skill.invocation === 'manual' ? t('skillsManual') : t('skillsAlways')}</span>
                <Switch
                  checked={skill.enabled}
                  label={skill.name}
                  onChange={(next) => {
                    setSkills(current => current.map(row => row.name === skill.name ? { ...row, enabled: next } : row))
                    if (editing === skill.name) setEnabled(next)
                  }}
                />
                <button
                  type="button"
                  className={css.remove}
                  onClick={() => {
                    setSkills(current => current.filter(row => row.name !== skill.name))
                    if (editing === skill.name) setEditing(undefined)
                  }}
                >
                  {t('skillsRemove')}
                </button>
              </li>
            ))}
          </ul>
        )}
      {formOpen && (
        <div className={css.form}>
          <label className={css.field}>
            {t('skillsImportUrl')}
            <Input value={githubUrl} onChange={(event) => { setGithubUrl(event.target.value) }} autoComplete="off" />
          </label>
          <div className={css.actions}>
            <Button type="button" variant="outline" size="sm" onClick={importGithub}>{t('skillsImport')}</Button>
          </div>
          <label className={css.field}>
            {t('skillsName')}
            <Input value={name} onChange={(event) => { setName(event.target.value) }} autoComplete="off" />
          </label>
          <label className={css.field}>
            {t('skillsDescription')}
            <Input value={description} onChange={(event) => { setDescription(event.target.value) }} autoComplete="off" />
          </label>
          <label className={css.field}>
            {t('skillsBody')}
            <textarea className={css.area} value={body} onChange={(event) => { setBody(event.target.value) }} spellCheck={false} />
          </label>
          <label className={css.field}>
            {t('skillsInvocation')}
            <select
              className={css.select}
              value={invocation}
              onChange={(event) => { setInvocation(event.target.value as DesktopSkillRecord['invocation']) }}
            >
              <option value="always">{t('skillsAlways')}</option>
              <option value="manual">{t('skillsManual')}</option>
            </select>
          </label>
          <label className={css.field}>
            {t('skillsProject')}
            <Input value={project} onChange={(event) => { setProject(event.target.value) }} autoComplete="off" />
          </label>
          <Switch checked={enabled} label={t('skillsEnabled')} onChange={setEnabled} />
          <div className={css.actions}>
            <Button type="button" variant="outline" size="sm" onClick={add}>{t('skillsAdd')}</Button>
            <Button type="button" variant="primary" size="sm" onClick={save}>{t('skillsSave')}</Button>
          </div>
        </div>
      )}
      {notice !== undefined && <p className={css.hint}>{notice}</p>}
    </section>
  )
}
