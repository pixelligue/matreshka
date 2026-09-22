import { expect, it } from 'vitest'
import { editContextActions, httpUrl } from '../src/edit-context-menu.ts'

it('accepts only http and https links', () => {
  expect(httpUrl('https://github.com/acme/demo')).toBe('https://github.com/acme/demo')
  expect(httpUrl('http://127.0.0.1:3020/register')).toBe('http://127.0.0.1:3020/register')
  expect(httpUrl('javascript:alert(1)')).toBeUndefined()
  expect(httpUrl('dsh-app://app/index.html')).toBeUndefined()
  expect(httpUrl('not a url')).toBeUndefined()
})

it('offers copy for a selection and the edit actions inside a field', () => {
  expect(editContextActions({
    linkURL: '',
    selectionText: 'hello',
    isEditable: false,
    canCut: false,
    canCopy: true,
    canPaste: false,
    canSelectAll: true,
  })).toEqual(['copy'])
  expect(editContextActions({
    linkURL: 'https://example.test',
    selectionText: '',
    isEditable: true,
    canCut: false,
    canCopy: false,
    canPaste: true,
    canSelectAll: true,
  })).toEqual(['open', 'paste', 'selectAll'])
  expect(editContextActions({
    linkURL: '',
    selectionText: '   ',
    isEditable: false,
    canCut: false,
    canCopy: false,
    canPaste: false,
    canSelectAll: false,
  })).toEqual([])
})
