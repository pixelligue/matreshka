/**
 * Jev consult/skip gate for the first step of a user turn.
 * @module @deepseek-ai/dsh-consult-matreshka/gate
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { PreStepDecision } from '@deepseek-ai/dsh-agent'
import { createUserMessage, type UserMessage } from '@deepseek-ai/dsh-llm'
import '@deepseek-ai/dsh-skill'
import { postConsult, postSelectTool, postSkillPlan, type MatreshkaSessionOptions, type SkillPlanResult } from './client.ts'

/** Jev candidates: chit-chat, simple task, or hard enough for Flash. */
export const CONSULT_GATE_CANDIDATES = ['skip', 'proceed', 'consult'] as const

const USER_TEXT_CAP = 4000

/** Instruction Jev sees after the user request. */
export const CONSULT_GATE_INSTRUCTION =
  'Choose exactly one. skip: greeting, thanks, chit-chat, or a question with no task. '
  + 'proceed: one clear straightforward task (a simple letter, ad, search, or CRM create) with no conflict or reputation risk. '
  + 'consult: messy or conflicting facts, an apology, several asks, missing ids for a write, money or legal risk, or "do not offend".'

/**
 * Goal posted to `/v1/tools/select` for the consult/skip gate.
 * @param userText - capped user-authored request
 * @returns the Jev state string
 */
export function consultGateGoal(userText: string): string {
  return `User request:\n${userText}\n\n${CONSULT_GATE_INSTRUCTION}`
}

/**
 * Concatenate user-authored text from one step's admitted messages.
 * @param messages - messages claimed for this step.
 * @returns trimmed user text, or empty when none.
 */
export function userAuthoredText(messages: readonly UserMessage[]): string {
  const chunks: string[] = []
  for (const message of messages) {
    if (message.source.kind !== 'user') continue
    for (const block of message.content) {
      if (block.type === 'text' && block.text.trim() !== '') chunks.push(block.text.trim())
    }
  }
  return chunks.join('\n')
}

function cap(text: string): string {
  if (text.length <= USER_TEXT_CAP) return text
  return text.slice(0, USER_TEXT_CAP)
}

function skillMessage(skill: SkillPlanResult['skills'][number]): UserMessage {
  return createUserMessage({
    content: [{
      type: 'text',
      text: [
        `<skill_content name="${skill.name}">`,
        '<skill_instructions>',
        skill.body,
        '</skill_instructions>',
        '</skill_content>',
      ].join('\n'),
    }],
    source: {
      kind: 'skill-invocation',
      name: skill.name,
      form: 'instructions',
    },
  })
}

function skillRoot(cwd: string | undefined): string | undefined {
  if (cwd !== undefined && cwd.trim() !== '') return join(cwd, '.dsh', 'skills')
  const home = process.env.DSH_HOME
  if (home !== undefined && home.trim() !== '') return join(home, 'skills')
  return undefined
}

function installSkills(cwd: string | undefined, skills: SkillPlanResult['skills']): void {
  const root = skillRoot(cwd)
  if (root === undefined) return
  for (const skill of skills) {
    const directory = join(root, skill.id)
    mkdirSync(directory, { recursive: true })
    writeFileSync(join(directory, 'SKILL.md'), skill.body.endsWith('\n') ? skill.body : `${skill.body}\n`)
  }
}

/**
 * Run Jev then optional Flash after `next()`, without blocking chat on errors.
 * @param payload - pre-step messages, step index, and abort signal.
 * @param next - waterfall continuation; MUST be awaited.
 * @param options - API origin and session token.
 * @returns the (possibly extended) pre-step decision.
 */
export async function consultGatePreStep(
  payload: { messages: readonly UserMessage[]; step: number; signal: AbortSignal; cwd?: string },
  next: () => Promise<PreStepDecision>,
  options: () => MatreshkaSessionOptions,
): Promise<PreStepDecision> {
  const decision = await next()
  if (decision.kind === 'reject' || payload.signal.aborted) return decision
  if (payload.step !== 1) return decision
  const text = userAuthoredText(payload.messages)
  if (text.length === 0) return decision
  const session = options()
  if (session.sessionToken.length === 0) return decision
  try {
    const pick = await postSelectTool(session, {
      goal: consultGateGoal(cap(text)),
      candidates: [...CONSULT_GATE_CANDIDATES],
    }, payload.signal)
    if (payload.signal.aborted) return decision
    let messages = decision.messages
    if (pick.tool !== 'skip') {
      try {
        const planned = await postSkillPlan(session, { request: cap(text), files: '' }, payload.signal)
        if (!payload.signal.aborted && planned.skills.length > 0) {
          installSkills(payload.cwd, planned.skills)
          messages = [...messages, ...planned.skills.map(skillMessage)]
        }
      } catch {
        // A missing skill must not block the turn.
      }
    }
    if (payload.signal.aborted) return decision
    if (pick.tool === 'consult') {
      try {
        await postConsult(session, {
          goal: cap(text),
          question: 'How should the agent handle this user request?',
          plan: 'Complete the request with available tools, without inventing facts or sending anything the user did not ask to send.',
        }, payload.signal)
      } catch {
        // The consultant stays off the transcript when it fails.
      }
    }
    return messages === decision.messages ? decision : { ...decision, messages }
  } catch {
    return decision
  }
}
