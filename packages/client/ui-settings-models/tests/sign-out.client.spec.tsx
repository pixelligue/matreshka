// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MATRESHKA_SESSION_TOKEN } from '../src/client/MatreshkaSignInDialog.tsx'
import { SignOutRow } from '../src/client/SignOutRow.tsx'
import type { SignOutRowProps } from '../src/client/SignOutRow.tsx'
import { ProfileFooter } from '../src/client/ProfileFooter.tsx'
import { SignOutFoot } from '../src/client/SignOutFoot.tsx'
import { MatreshkaSignInDialog } from '../src/client/MatreshkaSignInDialog.tsx'
import { writeSession } from '../src/client/session.ts'
import { en } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  sessionStorage.clear()
  localStorage.clear()
})

function props(overrides: Partial<SignOutRowProps> = {}): SignOutRowProps {
  const unusedHook = (() => { throw new Error('unused') }) as never
  return {
    t: key => key in en ? en[key as keyof typeof en] : key,
    operations: {
      describeCredential: vi.fn(),
      storeCredential: vi.fn(),
      removeCredential: vi.fn(() => Promise.resolve(undefined)),
      writeSettings: vi.fn(),
      discoverModels: vi.fn(),
    },
    apiOrigin: 'http://127.0.0.1:8016',
    reload: vi.fn(),
    useSessions: unusedHook,
    useSessionPendingInteraction: unusedHook,
    usePanelInfo: unusedHook,
    useResource: unusedHook,
    useWorkspaces: unusedHook,
    ...overrides,
  }
}

describe('SignOutRow', () => {
  it('posts logout with the stored bearer and unsets the session', async () => {
    sessionStorage.setItem(MATRESHKA_SESSION_TOKEN, 'sess-1')
    const track = vi.fn()
    vi.stubGlobal('dshDesktop', { analytics: { track } })
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))))
    const reload = vi.fn()
    const removeCredential = vi.fn(() => Promise.resolve(undefined))
    render(<SignOutRow {...props({ reload, operations: {
      describeCredential: vi.fn(),
      storeCredential: vi.fn(),
      removeCredential,
      writeSettings: vi.fn(),
      discoverModels: vi.fn(),
    } })} />)
    fireEvent.click(screen.getByRole('button', { name: en.signOut }))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8016/v1/auth/logout',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer sess-1' },
      }),
    ))
    await waitFor(() => expect(removeCredential).toHaveBeenCalledWith(MATRESHKA_SESSION_TOKEN))
    expect(reload).toHaveBeenCalled()
    expect(sessionStorage.getItem(MATRESHKA_SESSION_TOKEN)).toBeNull()
    expect(localStorage.getItem(MATRESHKA_SESSION_TOKEN)).toBeNull()
    expect(track).toHaveBeenCalledWith('ui_sign_out')
    expect(track.mock.calls.every(call => call[1] === undefined)).toBe(true)
  })

  it('opens the account menu from the profile row', () => {
    writeSession('sess-1', 'op@localhost')
    render(<ProfileFooter {...{ ...props(), wide: true }} />)
    expect(screen.getByText('op@localhost')).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: en.signOut })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: en.profileMenu }))
    expect(screen.getAllByRole('menuitem').map(item => item.textContent)).toEqual([
      en.profileSettings,
      en.signOut,
    ])
  })

  it('updates the profile email when a session is written after mount', async () => {
    render(<ProfileFooter {...{ ...props(), wide: true }} />)
    expect(screen.getByText(en.profile)).toBeTruthy()
    act(() => { writeSession('sess-1', 'op@localhost') })
    await waitFor(() => expect(screen.getByText('op@localhost')).toBeTruthy())
  })

  it('reloads even when logout fetch fails', async () => {
    writeSession('sess-1', 'op@localhost')
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('down'))))
    const reload = vi.fn()
    const removeCredential = vi.fn(() => Promise.resolve(undefined))
    render(<SignOutFoot {...{
      ...props({ reload, operations: {
        describeCredential: vi.fn(),
        storeCredential: vi.fn(),
        removeCredential,
        writeSettings: vi.fn(),
        discoverModels: vi.fn(),
      } }),
      wide: true,
    }} />)
    fireEvent.click(screen.getByRole('button', { name: en.signOut }))
    await waitFor(() => expect(reload).toHaveBeenCalled())
    expect(localStorage.getItem(MATRESHKA_SESSION_TOKEN)).toBeNull()
  })

  it('signs out from the settings-row control', async () => {
    sessionStorage.setItem(MATRESHKA_SESSION_TOKEN, 'sess-1')
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))))
    const reload = vi.fn()
    const removeCredential = vi.fn(() => Promise.resolve(undefined))
    render(<SignOutFoot {...{
      ...props({ reload, operations: {
        describeCredential: vi.fn(),
        storeCredential: vi.fn(),
        removeCredential,
        writeSettings: vi.fn(),
        discoverModels: vi.fn(),
      } }),
      wide: true,
    }} />)
    fireEvent.click(screen.getByRole('button', { name: en.signOut }))
    await waitFor(() => expect(removeCredential).toHaveBeenCalledWith(MATRESHKA_SESSION_TOKEN))
    expect(reload).toHaveBeenCalled()
  })

  it('returns the sign-in page after Sign out even when reload is a no-op', async () => {
    writeSession('sess-1', 'op@localhost')
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))))
    const reload = vi.fn()
    const operations = {
      describeCredential: vi.fn(() => Promise.resolve({ configured: true, writable: true })),
      storeCredential: vi.fn(() => Promise.resolve(undefined)),
      removeCredential: vi.fn(() => Promise.resolve(undefined)),
      writeSettings: vi.fn(),
      discoverModels: vi.fn(),
    }
    const unusedHook = (() => { throw new Error('unused') }) as never
    render(
      <>
        <SignOutFoot {...{ ...props({ reload, operations }), wide: true }} />
        <MatreshkaSignInDialog
          t={key => en[key]}
          operations={operations}
          apiOrigin="http://127.0.0.1:8016"
          useSessions={unusedHook}
          useSessionPendingInteraction={unusedHook}
          usePanelInfo={unusedHook}
          useResource={unusedHook}
          useWorkspaces={unusedHook}
        />
      </>,
    )
    await waitFor(() => expect(screen.queryByRole('heading', { name: en.signInTitle })).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: en.signOut }))
    expect(await screen.findByRole('heading', { name: en.signInTitle })).toBeTruthy()
    expect(reload).toHaveBeenCalled()
  })
})
