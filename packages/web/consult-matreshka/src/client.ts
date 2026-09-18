/**
 * Session-bearer posts to the Matreshka consult and tool-select APIs.
 * @module @deepseek-ai/dsh-consult-matreshka/client
 */

/** Default Matreshka API origin (same as Host apiOrigin). */
export const DEFAULT_MATRESHKA_API_ORIGIN = 'http://127.0.0.1:8016'

/** Options shared by consult and select posts. */
export interface MatreshkaSessionOptions {
  /** Matreshka API origin, no trailing slash required. */
  apiOrigin: string
  /** Current Matreshka session token; empty means unavailable. */
  sessionToken: string
}

/** Body for {@link postConsult}. */
export interface ConsultInput {
  readonly goal: string
  readonly question: string
  readonly plan?: string
  readonly evidence?: string
}

/** JSON from `POST /v1/consult`. */
export interface ConsultResult {
  readonly verdict: string
  readonly detail: string
}

/** Body for {@link postSelectTool}. */
export interface SelectToolInput {
  readonly goal: string
  readonly candidates: readonly string[]
}

/** JSON from `POST /v1/tools/select`. */
export interface SelectToolResult {
  readonly tool: string
  readonly confidence: number
}

/**
 * POST `/v1/consult` with the session bearer.
 * @param options - API origin and session token.
 * @param input - short consult payload.
 * @param signal - optional abort signal.
 * @returns the API verdict.
 */
export async function postConsult(
  options: MatreshkaSessionOptions,
  input: ConsultInput,
  signal?: AbortSignal,
): Promise<ConsultResult> {
  if (options.sessionToken.length === 0) {
    throw new Error('Matreshka session is required for consult')
  }
  const payload = await postJson(
    `${originOf(options.apiOrigin)}/v1/consult`,
    options.sessionToken,
    {
      goal: input.goal,
      question: input.question,
      ...input.plan !== undefined ? { plan: input.plan } : {},
      ...input.evidence !== undefined ? { evidence: input.evidence } : {},
    },
    signal,
  )
  return {
    verdict: typeof payload.verdict === 'string' ? payload.verdict : 'risk',
    detail: typeof payload.detail === 'string' ? payload.detail : '',
  }
}

/**
 * POST `/v1/tools/select` with the session bearer.
 * @param options - API origin and session token.
 * @param input - goal and candidate tool names.
 * @param signal - optional abort signal.
 * @returns the chosen tool name and confidence.
 */
export async function postSelectTool(
  options: MatreshkaSessionOptions,
  input: SelectToolInput,
  signal?: AbortSignal,
): Promise<SelectToolResult> {
  if (options.sessionToken.length === 0) {
    throw new Error('Matreshka session is required for tool select')
  }
  const payload = await postJson(
    `${originOf(options.apiOrigin)}/v1/tools/select`,
    options.sessionToken,
    { goal: input.goal, candidates: [...input.candidates] },
    signal,
  )
  const confidence = typeof payload.confidence === 'number' ? payload.confidence : 0
  return {
    tool: typeof payload.tool === 'string' ? payload.tool : '',
    confidence,
  }
}

function originOf(apiOrigin: string): string {
  return apiOrigin.replace(/\/$/, '')
}

async function postJson(
  url: string,
  token: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      redirect: 'error',
      headers: {
        'authorization': `Bearer ${token}`,
        'content-type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(body),
      ...signal !== undefined ? { signal } : {},
    })
  } catch (error: unknown) {
    throw new Error(`Matreshka consult request failed: ${String(error)}`, { cause: error })
  }
  if (!response.ok) {
    throw new Error(`Matreshka consult API error (HTTP ${response.status})`)
  }
  const payload: unknown = await response.json()
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new Error('Matreshka consult API returned an unprocessable body')
  }
  return payload as Record<string, unknown>
}
