/** Model column on the public comparison table. */
export const BENCH_MODEL_IDS = ['matrena', 'gemini', 'opus', 'gigachat', 'alice', 'gpt'] as const

/** @see BENCH_MODEL_IDS */
export type BenchModelId = (typeof BENCH_MODEL_IDS)[number]

/** Published board row on the public comparison table. */
export const BENCH_ROW_IDS = ['swe', 'tb20', 'tb21', 'tau2', 'mcp', 'osworld', 'gpqa'] as const

/** @see BENCH_ROW_IDS */
export type BenchRowId = (typeof BENCH_ROW_IDS)[number]

/** One published board and the scores we are willing to print. */
export interface BenchRow {
  id: BenchRowId
  scores: Record<BenchModelId, number | null>
}

/**
 * Public scores from the Matrena comparison card.
 * `null` means no publication on that board for that model.
 */
export const BENCH_ROWS: readonly BenchRow[] = [
  { id: 'swe', scores: { matrena: 79.0, gemini: 80.0, opus: 96.0, gigachat: 42.6, alice: null, gpt: 82.2 } },
  { id: 'tb20', scores: { matrena: 89.0, gemini: 89.4, opus: 89.1, gigachat: 13.5, alice: null, gpt: 91.9 } },
  { id: 'tb21', scores: { matrena: 91.4, gemini: null, opus: null, gigachat: null, alice: null, gpt: null } },
  { id: 'tau2', scores: { matrena: 95.0, gemini: null, opus: null, gigachat: 68.7, alice: null, gpt: null } },
  { id: 'mcp', scores: { matrena: 72.0, gemini: null, opus: null, gigachat: null, alice: null, gpt: null } },
  { id: 'osworld', scores: { matrena: 61.0, gemini: 59.0, opus: 75.4, gigachat: null, alice: null, gpt: 62.6 } },
  { id: 'gpqa', scores: { matrena: 88.1, gemini: 95.3, opus: 93.2, gigachat: 61.1, alice: null, gpt: 94.6 } },
]

/** Board ids shown as large figures on the home banner and the Matrena page. */
export const BANNER_ROW_IDS = ['swe', 'tb21', 'tau2'] as const

/**
 * @param value - a published percent, or null when unpublished
 * @returns a one-decimal percent, or a hyphen when unpublished
 */
export function formatScore(value: number | null): string {
  if (value === null) {
    return '-'
  }
  return `${value.toFixed(1)}%`
}

/**
 * @param row - one published board
 * @returns model ids that share the highest published score
 */
export function rowLeaders(row: BenchRow): readonly BenchModelId[] {
  let max = Number.NEGATIVE_INFINITY
  for (const id of BENCH_MODEL_IDS) {
    const value = row.scores[id]
    if (value !== null && value > max) {
      max = value
    }
  }
  if (max === Number.NEGATIVE_INFINITY) {
    return []
  }
  return BENCH_MODEL_IDS.filter(id => row.scores[id] === max)
}

/**
 * @param id - published board id
 * @returns that row from {@link BENCH_ROWS}
 */
export function benchRow(id: BenchRowId): BenchRow {
  const row = BENCH_ROWS.find(entry => entry.id === id)
  if (row === undefined) {
    throw new Error(`unknown bench row: ${id}`)
  }
  return row
}
