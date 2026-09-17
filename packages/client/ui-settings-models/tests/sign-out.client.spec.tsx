// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MATRESHKA_SESSION_TOKEN } from '../src/client/MatreshkaSignInDialog.tsx'
import { SignOutRow } from '../src/client/SignOutRow.tsx'
import type { SignOutRowProps } from '../src/client/SignOutRow.tsx'
import { ProfileFooter } from '../src/client/ProfileFooter.tsx'
import { SignOutFoot } from '../src/client/SignOutFoot.tsx'
import { MATRESHKA_SESSION_EMAIL } from '../src/client/session.ts'
import { en } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

function props(overrides: Partial<SignOutRowProps> = {}): SignOutRowProps {
  const unusedHook = (() => { throw new Error('unused') }) as never
  return {
    t: key => en[key],
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
  })

  it('renders the signed-in email without a sign-out control on the profile row', () => {
    sessionStorage.setItem(MATRESHKA_SESSION_EMAIL, 'op@localhost')
    render(<ProfileFooter {...{ ...props(), wide: true }} />)
    expect(screen.getByText('op@localhost')).toBeTruthy()
    expect(screen.queryByRole('button', { name: en.signOut })).toBeNull()
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
})
