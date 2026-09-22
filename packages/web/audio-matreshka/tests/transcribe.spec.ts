import { describe, expect, it } from 'vitest'
import { transcribeFormat } from '../src/client.ts'

describe('transcribeFormat', () => {
  it('accepts the playable extensions and maps oga to ogg', () => {
    expect(transcribeFormat('C:\\voice\\note.mp3')).toBe('mp3')
    expect(transcribeFormat('/tmp/note.wav')).toBe('wav')
    expect(transcribeFormat('clip.OGG')).toBe('ogg')
    expect(transcribeFormat('clip.oga')).toBe('ogg')
    expect(transcribeFormat('clip.m4a')).toBe('m4a')
    expect(transcribeFormat('clip.aac')).toBe('aac')
    expect(transcribeFormat('clip.webm')).toBe('webm')
    expect(transcribeFormat('notes.txt')).toBeUndefined()
  })
})
