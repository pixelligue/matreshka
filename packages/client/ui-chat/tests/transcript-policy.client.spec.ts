import { afterEach, describe, expect, it } from 'vitest'
import { hideInternalCommand, internalRowVisibility, chatTranscriptPolicy } from '../src/client/transcript-policy.ts'

afterEach(() => {
  chatTranscriptPolicy.hideInternal = false
  chatTranscriptPolicy.hideTurnUsage = false
  chatTranscriptPolicy.hideSessionStats = false
})

describe('chatTranscriptPolicy', () => {
  it('keeps internal rows visible by default', () => {
    expect(internalRowVisibility()).toBe('visible')
    expect(hideInternalCommand('permission')).toBe(false)
  })

  it('hides permission commands and internal rows when enabled', () => {
    chatTranscriptPolicy.hideInternal = true
    expect(internalRowVisibility()).toBe('hidden')
    expect(hideInternalCommand('permission')).toBe(true)
    expect(hideInternalCommand('compact')).toBe(false)
    expect(hideInternalCommand(undefined)).toBe(false)
  })
})
