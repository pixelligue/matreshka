// @vitest-environment jsdom
import type { GlobalStandardProps } from '@deepseek-ai/dsh-client-ui-slots'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_MATRESHKA_API_ORIGIN,
  MATRESHKA_SESSION_TOKEN,
  MatreshkaSignInDialog,
} from '../src/client/MatreshkaSignInDialog.tsx'
import type { MatreshkaSignInDialogProps } from '../src/client/MatreshkaSignInDialog.tsx'
import { clearSession, writeSession } from '../src/client/session.ts'
import { en } from '../src/client/locales.ts'

const useResource = (() => ({
  status: 'none' as const,
  value: undefined,
  failure: undefined,
  reload: () => {},
})) as GlobalStandardProps['useResource']
const usePanelInfo: GlobalStandardProps['usePanelInfo'] = selector => selector({ activePanelId: null })

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  sessionStorage.clear()
  localStorage.clear()
  document.getElementById('root')?.remove()
})

beforeEach(() => {
  const root = document.createElement('div')
  root.id = 'root'
  document.body.appendChild(root)
})

type AttentionSnapshot = Parameters<Parameters<MatreshkaSignInDialogProps['useSessionPendingInteraction']>[0]>[0]
const noAttention: AttentionSnapshot = new Map()
const useSessionPendingInteraction: MatreshkaSignInDialogProps['useSessionPendingInteraction'] = selector => selector(noAttention)

function props(overrides: Partial<MatreshkaSignInDialogProps> = {}): MatreshkaSignInDialogProps {
  const unusedHook = (() => { throw new Error('unused standard hook') }) as never
  return {
    useSessions: unusedHook,
    useSessionPendingInteraction,
    usePanelInfo,
    useResource,
    useWorkspaces: unusedHook,
    operations: {
      describeCredential: vi.fn(() => Promise.resolve(undefined)),
      storeCredential: vi.fn(() => Promise.resolve(undefined)),
      removeCredential: vi.fn(() => Promise.resolve(undefined)),
      writeSettings: vi.fn(),
      discoverModels: vi.fn(),
    },
    t: key => en[key],
    apiOrigin: DEFAULT_MATRESHKA_API_ORIGIN,
    ...overrides,
  }
}

async function showPage(overrides: Partial<MatreshkaSignInDialogProps> = {}) {
  const view = render(<MatreshkaSignInDialog {...props(overrides)} />)
  expect(await screen.findByRole('heading', { name: en.signInTitle })).toBeTruthy()
  return view
}

describe('MatreshkaSignInDialog', () => {
  it('paints nothing while the session credential is still loading', () => {
    render(<MatreshkaSignInDialog {...props({
      operations: {
        describeCredential: () => new Promise(() => {}),
        storeCredential: vi.fn(() => Promise.resolve(undefined)),
        removeCredential: vi.fn(() => Promise.resolve(undefined)),
        writeSettings: vi.fn(),
        discoverModels: vi.fn(),
      },
    })} />)
    expect(screen.queryByRole('heading', { name: en.signInTitle })).toBeNull()
    expect(document.querySelector('[data-matreshka-sign-in]')).toBeNull()
    expect(document.getElementById('root')?.inert).not.toBe(true)
  })

  it('does not paint after unmount during a pending describe', async () => {
    let resolveDescribe: (value: { configured: boolean; writable: boolean }) => void = () => {}
    const view = render(<MatreshkaSignInDialog {...props({
      operations: {
        describeCredential: () => new Promise((resolve) => { resolveDescribe = resolve }),
        storeCredential: vi.fn(() => Promise.resolve(undefined)),
        removeCredential: vi.fn(() => Promise.resolve(undefined)),
        writeSettings: vi.fn(),
        discoverModels: vi.fn(),
      },
    })} />)
    view.unmount()
    resolveDescribe({ configured: true, writable: true })
    await Promise.resolve()
    expect(document.querySelector('[data-matreshka-sign-in]')).toBeNull()
    expect(document.getElementById('root')?.inert).not.toBe(true)
  })

  it('does not paint after unmount during a failed describe', async () => {
    let rejectDescribe: (reason: Error) => void = () => {}
    const view = render(<MatreshkaSignInDialog {...props({
      operations: {
        describeCredential: () => new Promise((_, reject) => { rejectDescribe = reject }),
        storeCredential: vi.fn(() => Promise.resolve(undefined)),
        removeCredential: vi.fn(() => Promise.resolve(undefined)),
        writeSettings: vi.fn(),
        discoverModels: vi.fn(),
      },
    })} />)
    view.unmount()
    rejectDescribe(new Error('credentials down'))
    await Promise.resolve()
    expect(document.querySelector('[data-matreshka-sign-in]')).toBeNull()
    expect(document.getElementById('root')?.inert).not.toBe(true)
  })

  it('shows a full-viewport Matreshka page when no session exists', async () => {
    await showPage()
    const page = document.querySelector('[data-matreshka-sign-in]')
    expect(page?.parentElement).toBe(document.body)
    expect(document.getElementById('root')?.contains(page)).toBe(false)
    expect(document.getElementById('root')?.inert).toBe(true)
    expect(document.querySelector('[data-matreshka-logo-slot]')?.getAttribute('src')).toBe('/matreshka-logo.png')
    expect(screen.getByLabelText(en.signInEmail)).toBeTruthy()
    expect(screen.getByLabelText(en.signInPassword)).toBeTruthy()
    expect(screen.queryByText(en.onboardingTitle)).toBeNull()
    expect(screen.queryByRole('button', { name: en.onboardingLater })).toBeNull()
  })

  it('still paints the page when #root is absent', async () => {
    document.getElementById('root')?.remove()
    await showPage()
    expect(document.querySelector('[data-matreshka-sign-in]')?.parentElement).toBe(document.body)
  })

  it('restores the previous #root inert state when the page unmounts', async () => {
    const view = await showPage()
    const appRoot = document.getElementById('root')
    expect(appRoot?.inert).toBe(true)
    view.unmount()
    expect(appRoot?.inert).not.toBe(true)
  })

  it('shows the page when describing the session credential fails', async () => {
    await showPage({
      operations: {
        describeCredential: vi.fn(() => Promise.reject(new Error('credentials down'))),
        storeCredential: vi.fn(() => Promise.resolve(undefined)),
        removeCredential: vi.fn(() => Promise.resolve(undefined)),
        writeSettings: vi.fn(),
        discoverModels: vi.fn(),
      },
    })
    expect(document.getElementById('root')?.inert).toBe(true)
  })

  it('dismisses after a successful login stores the session token', async () => {
    const storeCredential = vi.fn(() => Promise.resolve(undefined))
    const track = vi.fn()
    vi.stubGlobal('dshDesktop', { analytics: { track } })
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(
      JSON.stringify({ token: 'sess-1' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ))))
    await showPage({
      operations: {
        describeCredential: vi.fn(() => Promise.resolve(undefined)),
        storeCredential,
        removeCredential: vi.fn(() => Promise.resolve(undefined)),
        writeSettings: vi.fn(),
        discoverModels: vi.fn(),
      },
    })
    fireEvent.change(screen.getByLabelText(en.signInEmail), { target: { value: 'op@localhost' } })
    fireEvent.change(screen.getByLabelText(en.signInPassword), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: en.signInSubmit }))
    await waitFor(() => expect(storeCredential).toHaveBeenCalledWith(MATRESHKA_SESSION_TOKEN, 'sess-1'))
    expect(localStorage.getItem(MATRESHKA_SESSION_TOKEN)).toBe('sess-1')
    expect(localStorage.getItem('MATRESHKA_SESSION_EMAIL')).toBe('op@localhost')
    expect(screen.queryByRole('heading', { name: en.signInTitle })).toBeNull()
    expect(track).toHaveBeenCalledWith('ui_sign_in')
    expect(track.mock.calls.every(call => call[1] === undefined)).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      `${DEFAULT_MATRESHKA_API_ORIGIN}/v1/auth/login`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('posts login to an overridden API origin', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(
      JSON.stringify({ token: 'sess-1' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ))))
    await showPage({ apiOrigin: 'http://127.0.0.1:9' })
    fireEvent.change(screen.getByLabelText(en.signInEmail), { target: { value: 'op@localhost' } })
    fireEvent.change(screen.getByLabelText(en.signInPassword), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: en.signInSubmit }))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:9/v1/auth/login',
      expect.objectContaining({ method: 'POST' }),
    ))
  })

  it('strips a trailing slash from the configured API origin', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(
      JSON.stringify({ token: 'sess-1' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ))))
    await showPage({ apiOrigin: `${DEFAULT_MATRESHKA_API_ORIGIN}/` })
    fireEvent.change(screen.getByLabelText(en.signInEmail), { target: { value: 'op@localhost' } })
    fireEvent.change(screen.getByLabelText(en.signInPassword), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: en.signInSubmit }))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      `${DEFAULT_MATRESHKA_API_ORIGIN}/v1/auth/login`,
      expect.objectContaining({ method: 'POST' }),
    ))
  })

  it('keeps the page with locale-owned copy on 401', async () => {
    const track = vi.fn()
    vi.stubGlobal('dshDesktop', { analytics: { track } })
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(
      JSON.stringify({ detail: 'Invalid email or password' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    ))))
    await showPage()
    fireEvent.change(screen.getByLabelText(en.signInEmail), { target: { value: 'op@localhost' } })
    fireEvent.change(screen.getByLabelText(en.signInPassword), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: en.signInSubmit }))
    expect((await screen.findByRole('alert')).textContent).toBe(en.signInInvalid)
    expect(track).not.toHaveBeenCalled()
    expect(document.querySelector('[data-matreshka-sign-in]')).toBeTruthy()
  })

  it('keeps the page with locale-owned copy when login is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
    await showPage()
    fireEvent.change(screen.getByLabelText(en.signInEmail), { target: { value: 'op@localhost' } })
    fireEvent.change(screen.getByLabelText(en.signInPassword), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: en.signInSubmit }))
    expect((await screen.findByRole('alert')).textContent).toBe(en.signInNetwork)
  })

  it('keeps the page when login returns a non-401 failure', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('nope', { status: 503 }))))
    await showPage()
    fireEvent.change(screen.getByLabelText(en.signInEmail), { target: { value: 'op@localhost' } })
    fireEvent.change(screen.getByLabelText(en.signInPassword), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: en.signInSubmit }))
    expect((await screen.findByRole('alert')).textContent).toBe(en.signInNetwork)
  })

  it('keeps the page when login omits a token', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(
      JSON.stringify({ token: '' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ))))
    await showPage()
    fireEvent.change(screen.getByLabelText(en.signInEmail), { target: { value: 'op@localhost' } })
    fireEvent.change(screen.getByLabelText(en.signInPassword), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: en.signInSubmit }))
    expect((await screen.findByRole('alert')).textContent).toBe(en.signInNetwork)
  })

  it('keeps the page when storing the session token is refused', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(
      JSON.stringify({ token: 'sess-1' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ))))
    await showPage({
      operations: {
        describeCredential: vi.fn(() => Promise.resolve(undefined)),
        storeCredential: vi.fn(() => Promise.resolve('refused')),
        removeCredential: vi.fn(() => Promise.resolve(undefined)),
        writeSettings: vi.fn(),
        discoverModels: vi.fn(),
      },
    })
    fireEvent.change(screen.getByLabelText(en.signInEmail), { target: { value: 'op@localhost' } })
    fireEvent.change(screen.getByLabelText(en.signInPassword), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: en.signInSubmit }))
    expect((await screen.findByRole('alert')).textContent).toBe(en.signInNetwork)
  })

  it('keeps the page when the Host credential exists but this window has no token', async () => {
    render(<MatreshkaSignInDialog {...props({
      operations: {
        describeCredential: vi.fn(() => Promise.resolve({
          configured: true,
          writable: true,
        })),
        storeCredential: vi.fn(() => Promise.resolve(undefined)),
        removeCredential: vi.fn(() => Promise.resolve(undefined)),
        writeSettings: vi.fn(),
        discoverModels: vi.fn(),
      },
    })} />)
    expect(await screen.findByRole('heading', { name: en.signInTitle })).toBeTruthy()
  })

  it('stays hidden when a session credential is already stored', async () => {
    sessionStorage.setItem(MATRESHKA_SESSION_TOKEN, 'sess-1')
    localStorage.setItem(MATRESHKA_SESSION_TOKEN, 'sess-1')
    render(<MatreshkaSignInDialog {...props({
      operations: {
        describeCredential: vi.fn(() => Promise.resolve({
          configured: true,
          writable: true,
        })),
        storeCredential: vi.fn(() => Promise.resolve(undefined)),
        removeCredential: vi.fn(() => Promise.resolve(undefined)),
        writeSettings: vi.fn(),
        discoverModels: vi.fn(),
      },
    })} />)
    await waitFor(() => expect(screen.queryByRole('heading', { name: en.signInTitle })).toBeNull())
    expect(document.getElementById('root')?.inert).not.toBe(true)
  })

  it('returns to the page when the browser session is cleared', async () => {
    writeSession('sess-1', 'op@localhost')
    render(<MatreshkaSignInDialog {...props({
      operations: {
        describeCredential: vi.fn(() => Promise.resolve({
          configured: true,
          writable: true,
        })),
        storeCredential: vi.fn(() => Promise.resolve(undefined)),
        removeCredential: vi.fn(() => Promise.resolve(undefined)),
        writeSettings: vi.fn(),
        discoverModels: vi.fn(),
      },
    })} />)
    await waitFor(() => expect(screen.queryByRole('heading', { name: en.signInTitle })).toBeNull())
    act(() => { clearSession() })
    expect(await screen.findByRole('heading', { name: en.signInTitle })).toBeTruthy()
  })

  it('keeps email and password when Desktop local login is forced', async () => {
    vi.stubGlobal('dshDesktop', {
      analytics: { track: vi.fn() },
      auth: {
        localLogin: () => Promise.resolve(true),
        openWebsiteLogin: vi.fn(() => Promise.resolve()),
        subscribeAuthCode: () => () => {},
      },
    })
    await showPage()
    expect(screen.getByLabelText(en.signInEmail)).toBeTruthy()
  })

  it('opens the website instead of collecting a password on packaged Desktop', async () => {
    const openWebsiteLogin = vi.fn(() => Promise.resolve())
    vi.stubGlobal('dshDesktop', {
      analytics: { track: vi.fn() },
      auth: {
        localLogin: () => Promise.resolve(false),
        openWebsiteLogin,
        subscribeAuthCode: () => () => {},
      },
    })
    await showPage()
    expect(screen.queryByLabelText(en.signInEmail)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: en.signInWebsite }))
    await waitFor(() => expect(openWebsiteLogin).toHaveBeenCalledOnce())
  })

  it('exchanges a one-time desktop code for a session token', async () => {
    const storeCredential = vi.fn(() => Promise.resolve(undefined))
    const track = vi.fn()
    let deliver: ((code: string) => void) | undefined
    vi.stubGlobal('dshDesktop', {
      analytics: { track },
      auth: {
        localLogin: () => Promise.resolve(false),
        openWebsiteLogin: vi.fn(() => Promise.resolve()),
        subscribeAuthCode: (listener: (code: string) => void) => {
          deliver = listener
          return () => {}
        },
      },
    })
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(
      JSON.stringify({ token: 'desk-1', email: 'op@example.com' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ))))
    await showPage({
      operations: {
        describeCredential: vi.fn(() => Promise.resolve(undefined)),
        storeCredential,
        removeCredential: vi.fn(() => Promise.resolve(undefined)),
        writeSettings: vi.fn(),
        discoverModels: vi.fn(),
      },
    })
    act(() => { deliver?.('once-code-1') })
    await waitFor(() => expect(storeCredential).toHaveBeenCalledWith(MATRESHKA_SESSION_TOKEN, 'desk-1'))
    expect(fetch).toHaveBeenCalledWith(
      `${DEFAULT_MATRESHKA_API_ORIGIN}/v1/auth/exchange`,
      expect.objectContaining({ method: 'POST' }),
    )
    expect(track).toHaveBeenCalledWith('ui_sign_in')
    expect(screen.queryByRole('heading', { name: en.signInTitle })).toBeNull()
  })
})
