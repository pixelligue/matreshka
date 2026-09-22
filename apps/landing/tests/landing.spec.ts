// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthPage } from '../src/AuthPage'
import { BENCH_ROWS, formatScore, rowLeaders } from '../src/benchmarks'
import { LandingPage } from '../src/LandingPage'
import { MatrenaPage } from '../src/MatrenaPage'
import { en, ru } from '../src/locales'
import { desktopAuthHref } from '../src/paths'
import { LANDING_SESSION_KEY, readLandingSession, writeLandingSession } from '../src/session'

const forbidden = /OpenAI|ChatGPT|DeepSeek Harness|репозитор|working folder|уже используете|already use/
const catalogStrip = /amoCRM|Bitrix24|Tilda|Amadeus/
const meraCallout = /MERA|next submit|следующ/

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Matreshka landing copy', () => {
  it('renders the Russian page for ordinary operators without a services strip', () => {
    render(createElement(LandingPage, { copy: ru, locale: 'ru', downloadUrl: '' }))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Matreshka')
    expect(screen.getByText(ru.pitch)).toBeTruthy()
    expect(screen.getByText(ru.bannerLead)).toBeTruthy()
    expect(screen.getByText('79.0%')).toBeTruthy()
    expect(screen.getByText('91.4%')).toBeTruthy()
    expect(screen.getByText('95.0%')).toBeTruthy()
    expect(screen.getByRole('link', { name: ru.bannerMore }).getAttribute('href')).toBe('/matrena')
    expect(screen.getByText(ru.downloadWindows)).toBeTruthy()
    expect(screen.getByRole('heading', { name: ru.cardDesktopTitle })).toBeTruthy()
    expect(screen.getByRole('heading', { name: ru.cardPluginsTitle })).toBeTruthy()
    expect(screen.getAllByRole('heading', { name: ru.cardMatrenaTitle }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: ru.downloadWindows })).toBeNull()
    expect(screen.queryByAltText('amoCRM')).toBeNull()
    expect(JSON.stringify(ru)).not.toMatch(forbidden)
    expect(JSON.stringify(ru)).not.toMatch(catalogStrip)
    expect(JSON.stringify(ru)).not.toMatch(meraCallout)
  })

  it('renders the English page and keeps Matreshka and Matrena', () => {
    render(createElement(LandingPage, {
      copy: en,
      locale: 'en',
      downloadUrl: 'https://example.test/matreshka.exe',
    }))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Matreshka')
    expect(screen.getByText(en.pitch)).toBeTruthy()
    expect(screen.getByRole('link', { name: en.downloadWindows }).getAttribute('href')).toBe(
      'https://example.test/matreshka.exe',
    )
    expect(screen.getByRole('link', { name: en.bannerMore }).getAttribute('href')).toBe('/en/matrena')
    expect(screen.getAllByRole('heading', { name: en.cardMatrenaTitle }).length).toBeGreaterThan(0)
    expect(JSON.stringify(en)).not.toMatch(forbidden)
    expect(JSON.stringify(en)).not.toMatch(catalogStrip)
  })
})

describe('Matrena evaluation page', () => {
  it('prints the public table and does not claim Matrena leads every board', () => {
    render(createElement(MatrenaPage, { copy: ru, locale: 'ru', downloadUrl: '' }))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Matrena')
    expect(screen.getByText(ru.pageLede)).toBeTruthy()
    expect(screen.getByText(ru.compareLead)).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: ru.models.gemini })).toBeTruthy()
    expect(screen.getByRole('rowheader', { name: ru.rows.swe })).toBeTruthy()
    expect(screen.getByText(ru.footnote)).toBeTruthy()
    expect(screen.getByText(ru.emptyNote)).toBeTruthy()
    expect(screen.getByRole('link', { name: ru.backHome }).getAttribute('href')).toBe('/')
    expect(screen.queryByRole('link', { name: ru.downloadWindows })).toBeNull()
  })

  it('keeps English evaluation copy on the English path', () => {
    render(createElement(MatrenaPage, {
      copy: en,
      locale: 'en',
      downloadUrl: 'https://example.test/matreshka.exe',
    }))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Matrena')
    expect(screen.getByText(en.compareLead)).toBeTruthy()
    expect(screen.getByRole('link', { name: en.downloadWindows }).getAttribute('href')).toBe(
      'https://example.test/matreshka.exe',
    )
    expect(screen.getByRole('link', { name: en.backHome }).getAttribute('href')).toBe('/en')
  })
})

describe('published scores', () => {
  it('formats unpublished cells as a hyphen and marks row leaders', () => {
    expect(formatScore(79)).toBe('79.0%')
    expect(formatScore(null)).toBe('-')
    const swe = BENCH_ROWS.find(row => row.id === 'swe')!
    expect(rowLeaders(swe)).toEqual(['opus'])
    const tb21 = BENCH_ROWS.find(row => row.id === 'tb21')!
    expect(rowLeaders(tb21)).toEqual(['matrena'])
  })
})

describe('landing auth pages', () => {
  it('renders Russian login without the marketing hero', () => {
    render(createElement(AuthPage, {
      copy: ru,
      locale: 'ru',
      mode: 'login',
      apiOrigin: 'http://127.0.0.1:8016',
      desktopHandoff: false,
    }))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(ru.authLoginTitle)
    expect(screen.queryByText(ru.pitch)).toBeNull()
    expect(screen.getByRole('link', { name: ru.navSignIn }).getAttribute('href')).toBe('/login')
  })

  it('renders Russian register', () => {
    render(createElement(AuthPage, {
      copy: ru,
      locale: 'ru',
      mode: 'register',
      apiOrigin: 'http://127.0.0.1:8016',
      desktopHandoff: false,
    }))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(ru.authRegisterTitle)
  })

  it('hands a desktop code without putting the bearer in the protocol URL', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { assign })
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo) => {
      const url = String(input)
      if (url.endsWith('/v1/auth/login')) {
        return new Response(JSON.stringify({ token: 'sess-secret', email: 'op@example.com' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ code: 'once-1', expiresIn: 60 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }))
    render(createElement(AuthPage, {
      copy: ru,
      locale: 'ru',
      mode: 'login',
      apiOrigin: 'http://127.0.0.1:8016',
      desktopHandoff: true,
    }))
    fireEvent.change(screen.getByLabelText(ru.authEmail), { target: { value: 'op@example.com' } })
    fireEvent.change(screen.getByLabelText(ru.authPassword), { target: { value: 'secret12' } })
    fireEvent.click(screen.getByRole('button', { name: ru.authSubmitLogin }))
    await waitFor(() => expect(assign).toHaveBeenCalledWith(desktopAuthHref('once-1')))
    expect(String(assign.mock.calls[0]?.[0])).not.toContain('sess-secret')
    expect(readLandingSession()?.email).toBe('op@example.com')
  })

  it('keeps the visitor signed in after reload', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ token: 'sess-2', email: 'new@example.com' }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    )))
    const { unmount } = render(createElement(AuthPage, {
      copy: ru,
      locale: 'ru',
      mode: 'register',
      apiOrigin: 'http://127.0.0.1:8016',
      desktopHandoff: false,
    }))
    fireEvent.change(screen.getByLabelText(ru.authEmail), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByLabelText(ru.authPassword), { target: { value: 'secret12' } })
    fireEvent.click(screen.getByRole('button', { name: ru.authSubmitRegister }))
    await waitFor(() => expect(screen.getByText(ru.authSignedIn)).toBeTruthy())
    expect(window.localStorage.getItem(LANDING_SESSION_KEY)).toContain('sess-2')
    unmount()
    render(createElement(AuthPage, {
      copy: ru,
      locale: 'ru',
      mode: 'login',
      apiOrigin: 'http://127.0.0.1:8016',
      desktopHandoff: false,
    }))
    expect(screen.getByText(ru.authSignedIn)).toBeTruthy()
    expect(screen.queryByLabelText(ru.authEmail)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: ru.authSignOut }))
    expect(screen.getByLabelText(ru.authEmail)).toBeTruthy()
    expect(readLandingSession()).toBeNull()
  })

  it('hands off a stored session to Desktop without a password form', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { assign })
    writeLandingSession({ token: 'sess-stored', email: 'op@example.com' })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ code: 'once-2', expiresIn: 60 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )))
    render(createElement(AuthPage, {
      copy: ru,
      locale: 'ru',
      mode: 'register',
      apiOrigin: 'http://127.0.0.1:8016',
      desktopHandoff: true,
    }))
    await waitFor(() => expect(assign).toHaveBeenCalledWith(desktopAuthHref('once-2')))
    expect(screen.queryByLabelText(ru.authEmail)).toBeNull()
  })
})
