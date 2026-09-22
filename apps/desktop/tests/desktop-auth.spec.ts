import { describe, expect, it } from 'vitest'
import {
  findDesktopAuthUrl,
  landingHandoffPath,
  parseDesktopAuthCode,
  protocolClientRegistration,
} from '../src/desktop-auth.ts'

describe('desktop auth protocol URLs', () => {
  it('opens register with a desktop handoff query', () => {
    expect(landingHandoffPath('ru')).toBe('/register?next=desktop')
    expect(landingHandoffPath('en')).toBe('/en/register?next=desktop')
  })

  it('reads a one-time code from matreshka://auth', () => {
    expect(parseDesktopAuthCode('matreshka://auth?code=once-code-1')).toBe('once-code-1')
    expect(parseDesktopAuthCode('"matreshka://auth?code=once-code-1"')).toBe('once-code-1')
  })

  it('rejects other hosts, schemes, and short codes', () => {
    expect(parseDesktopAuthCode('matreshka://other?code=once-code-1')).toBeUndefined()
    expect(parseDesktopAuthCode('https://example.test/auth?code=once-code-1')).toBeUndefined()
    expect(parseDesktopAuthCode('matreshka://auth?code=short')).toBeUndefined()
    expect(parseDesktopAuthCode('not a url')).toBeUndefined()
  })

  it('finds the protocol URL in argv', () => {
    expect(findDesktopAuthUrl(['electron', 'matreshka://auth?code=once-code-1'])).toBe(
      'matreshka://auth?code=once-code-1',
    )
    expect(findDesktopAuthUrl(['electron'])).toBeUndefined()
  })

  it('registers unpackaged protocol with the app directory, not argv flags', () => {
    const registration = protocolClientRegistration(true, {
      execPath: 'C:\\electron\\electron.exe',
      appPath: 'C:\\project\\matreshka\\apps\\desktop',
      userDataDir: 'C:\\project\\matreshka\\apps\\desktop\\.desktop-build\\development\\electron-user-data',
    })
    expect(registration?.path).toBe('C:\\electron\\electron.exe')
    expect(registration?.args[0]).toMatch(/^--user-data-dir=/)
    expect(registration?.args[1]).toBe('C:\\project\\matreshka\\apps\\desktop')
    expect(registration?.args.some(arg => arg.startsWith('--inspect') || arg.startsWith('matreshka:'))).toBe(false)
    expect(protocolClientRegistration(false, {
      execPath: 'C:\\electron\\electron.exe',
      appPath: 'C:\\project\\matreshka\\apps\\desktop',
      userDataDir: 'C:\\data',
    })).toBeUndefined()
  })
})
