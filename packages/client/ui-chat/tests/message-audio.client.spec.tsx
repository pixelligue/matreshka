// @vitest-environment jsdom

import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FileAttachmentRef } from '@deepseek-ai/dsh-attachment'
import { UserMessageNodeView } from '../src/client/chat/MessageItem.tsx'
import type { ChatNodeViewProps } from '../src/client/contract/slots.ts'

afterEach(() => { cleanup() })

const t = ((key: string, params?: Readonly<Record<string, string>>) => {
  if (key === 'message.audio') return `play ${params?.name ?? ''}`
  return key
}) as ChatNodeViewProps<'user'>['t']

function view(name: string, loadAudio?: (file: FileAttachmentRef) => Promise<string>) {
  const node = {
    kind: 'user' as const,
    key: 'user-1',
    data: {
      content: [{
        type: 'file' as const,
        attachment: { attachmentId: 'sha256:aa' as never, name, bytes: 4 },
      }],
    },
  }
  return render(
    <UserMessageNodeView
      {...{
        node,
        renderMessageImages: () => null,
        openFile: () => {},
        openSkill: () => {},
        t,
        useTurnData: () => undefined,
        ...(loadAudio === undefined ? {} : { loadAudio }),
      } as unknown as ChatNodeViewProps<'user'>}
    />,
  )
}

describe('sent audio', () => {
  it('plays a referenced recording and leaves text files as cards', async () => {
    const loadAudio = vi.fn(() => Promise.resolve('blob:note'))
    const audio = view('note.mp3', loadAudio)
    await waitFor(() => {
      expect(audio.container.querySelector('audio')?.getAttribute('src')).toBe('blob:note')
    })
    audio.unmount()

    const text = view('notes.txt', loadAudio)
    expect(text.container.querySelector('audio')).toBeNull()
    expect(text.getByTitle('notes.txt').textContent).toContain('notes.txt')
    expect(loadAudio).toHaveBeenCalledOnce()
  })
})
