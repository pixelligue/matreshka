// @vitest-environment jsdom
/** generate_image / edit_image rows: picture-sized skeletons while the call is running. */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { Context } from '@deepseek-ai/cordis'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import type { RunningToolCall, ToolResultNode } from '@deepseek-ai/dsh-client-ui-chat/client'
import { zh } from '@deepseek-ai/dsh-client-ui-conversation/src/client/locales.ts'
import {
  GenerateImageRow, generateImageToolview,
} from '../src/client/tool/toolviews/generate-image-row.tsx'

afterEach(cleanup)

const t = makeTranslate(zh, commonZh)

const sampleImage = {
  attachmentId: 'sha256:fe6d588c8d5a8e93c743d80524b9376634ca1cc262db9e1d21c9e4c18fc856cc',
  mediaType: 'image/png',
  bytes: 24_588,
  width: 1024,
  height: 1024,
  name: 'generated-1.png',
}

const running = (over?: Partial<RunningToolCall>): RunningToolCall => ({
  callId: 'c1', name: 'generate_image', argsRaw: '{"prompt":"a cat"}',
  turn: 1, step: 1, time: 1_000, subCalls: [], ...over,
})

const settled = (over?: Partial<ToolResultNode>): ToolResultNode => ({
  kind: 'tool-result', seq: 10, time: 2_000, callId: 'c1',
  call: { name: 'generate_image', argsRaw: '{"prompt":"a cat"}' },
  callTime: 1_000,
  content: [
    { type: 'text', text: 'Generated with openai/gpt-image-2 (1)' },
    { type: 'image', attachment: sampleImage },
  ],
  isError: false, subCalls: [], ...over,
} as unknown as ToolResultNode)

type RowProps = Parameters<typeof GenerateImageRow>[0]

function rowProps(block: RunningToolCall | ToolResultNode, over?: Partial<RowProps>): RowProps {
  return {
    callId: 'c1',
    toolName: 'generate_image',
    block,
    openFile: vi.fn(),
    loadImage: vi.fn().mockResolvedValue('blob:generated'),
    sessionId: 's1',
    t,
    ...over,
  } as unknown as RowProps
}

describe('GenerateImageRow', () => {
  it('shows one picture skeleton while generate_image is running', () => {
    const view = render(<GenerateImageRow {...rowProps(running())} />)
    expect(view.getByTestId('image-skeletons').querySelectorAll('[data-testid="image-skeleton"]')).toHaveLength(1)
    expect(view.getByText('正在生成图片…')).toBeTruthy()
    expect(view.queryByText('生成图片')).toBeNull()
    expect(view.queryByAltText('generated-1.png')).toBeNull()
  })

  it('shows n skeletons for a same-style batch still in flight', () => {
    const view = render(<GenerateImageRow {...rowProps(running({
      argsRaw: '{"prompt":"a cat","n":3}',
    }))} />)
    expect(view.getByTestId('image-skeletons').querySelectorAll('[data-testid="image-skeleton"]')).toHaveLength(3)
  })

  it('shows one skeleton while edit_image is running', () => {
    const view = render(<GenerateImageRow {...rowProps(running({
      name: 'edit_image',
      argsRaw: '{"instruction":"make it blue","attachmentId":"sha256:x"}',
    }), { toolName: 'edit_image' })} />)
    expect(view.getByTestId('image-skeletons').querySelectorAll('[data-testid="image-skeleton"]')).toHaveLength(1)
    expect(view.getByText('正在编辑图片…')).toBeTruthy()
    expect(view.queryByText('正在生成图片…')).toBeNull()
  })

  it('replaces skeletons with the settled pictures', async () => {
    const view = render(<GenerateImageRow {...rowProps(settled())} />)
    expect(view.queryByTestId('image-skeletons')).toBeNull()
    await waitFor(() => { expect(view.getByAltText('generated-1.png')).toBeTruthy() })
    expect(view.queryByText('生成图片')).toBeNull()
    expect((view.getByAltText('generated-1.png') as HTMLImageElement).src).toContain('blob:generated')
  })

  it('opens a preview and shows copy, save, and the saved folder', async () => {
    const block = settled()
    const content = [...block.content]
    content.splice(1, 0, {
      type: 'text',
      text: `image-file:${sampleImage.attachmentId}\tC:\\project\\matreshka\\apps\\desktop\\.desktop-build\\development\\home\\attachments\\v1\\objects\\fe\\file`,
    })
    const view = render(<GenerateImageRow {...rowProps({ ...block, content })} />)
    const preview = await waitFor(() => view.getByTestId('image-preview'))
    expect(view.getByText('保存在 C:\\project\\matreshka\\apps\\desktop\\.desktop-build\\development\\home\\attachments\\v1\\objects\\fe')).toBeTruthy()
    fireEvent.contextMenu(preview)
    expect(view.getByRole('menu')).toBeTruthy()
    expect(view.getAllByRole('menuitem').map(item => item.textContent)).toEqual(['复制', '下载', '复制路径'])
    fireEvent.click(preview)
    expect(view.getByRole('dialog', { name: '原图预览' })).toBeTruthy()
  })

  it('keeps the skeleton on a settled thumb until the URL resolves', () => {
    const loadImage = vi.fn(() => new Promise<string>(() => {}))
    const view = render(<GenerateImageRow {...rowProps(settled(), { loadImage })} />)
    expect(view.queryByTestId('image-skeletons')).toBeNull()
    expect(view.getByTestId('image-skeleton')).toBeTruthy()
  })

  it('registers generate_image and edit_image on the keyed toolview slot', () => {
    const registered: { key: unknown; locale: unknown; component: unknown }[] = []
    const ctx = {
      slots: {
        inject: (_name: string, callback: () => Iterable<() => void>) => {
          for (const _dispose of callback()) { /* exhaust transactional setup */ }
          return () => undefined
        },
        register: (options: { name: string; key: string; locale?: string }, component: unknown) => {
          registered.push({ key: options.key, locale: options.locale, component })
          return () => undefined
        },
      },
    } as unknown as Context
    generateImageToolview.apply(ctx)
    expect(registered.map(row => row.key)).toEqual(['generate_image', 'edit_image'])
    expect(registered.map(row => row.locale)).toEqual(['conversation', 'conversation'])
    expect(registered[0]!.component).toBe(GenerateImageRow)
    expect(registered[1]!.component).toBe(GenerateImageRow)
    expect(generateImageToolview.inject).toEqual(['slots'])
  })
})
