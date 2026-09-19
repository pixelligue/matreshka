// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { BENCH_ROWS, formatScore, rowLeaders } from '../src/benchmarks'
import { LandingPage } from '../src/LandingPage'
import { MatrenaPage } from '../src/MatrenaPage'
import { en, ru } from '../src/locales'

const forbidden = /OpenAI|ChatGPT|DeepSeek Harness|репозитор|working folder|уже используете|already use/
const catalogStrip = /amoCRM|Bitrix24|Tilda|Amadeus/
const meraCallout = /MERA|next submit|следующ/

afterEach(() => {
  cleanup()
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
