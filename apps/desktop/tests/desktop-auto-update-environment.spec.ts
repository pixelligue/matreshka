import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MATRESHKA_API_ORIGIN,
  desktopBuildRecordFilename,
  desktopUpdateMetadataFilename,
  resolveDesktopAutoUpdateConfig,
  resolveDesktopAutoUpdateEnvironment,
  resolveDesktopAutoUpdateTarget,
  resolveDesktopUploadConfig,
} from '../scripts/desktop-auto-update-environment.mjs'

describe('desktop auto-update environment', () => {
  it('defaults the Windows feed to the Matreshka API origin', () => {
    expect(resolveDesktopAutoUpdateConfig({}, 'win32', 'x64')).toEqual({
      environment: 'test',
      target: 'win-x64',
      origin: DEFAULT_MATRESHKA_API_ORIGIN,
      publicUrl: `${DEFAULT_MATRESHKA_API_ORIGIN}/v1/updates/desktop/win-x64/`,
      keyPrefix: 'v1/updates/desktop/win-x64',
    })
    const url = resolveDesktopAutoUpdateConfig({}, 'win32', 'x64').publicUrl
    expect(url).not.toContain('download.deepseek.com')
    expect(url).not.toContain('_/harness/desktop/stable')
  })

  it('allows an HTTP override origin and keeps COS upload settings separate', () => {
    expect(resolveDesktopAutoUpdateEnvironment({})).toBe('test')
    expect(resolveDesktopAutoUpdateConfig({
      MATRESHKA_API_ORIGIN: 'http://127.0.0.1:8016/',
    }, 'darwin', 'arm64')).toEqual({
      environment: 'test',
      target: 'mac-arm64',
      origin: 'http://127.0.0.1:8016',
      publicUrl: 'http://127.0.0.1:8016/v1/updates/desktop/mac-arm64/',
      keyPrefix: 'v1/updates/desktop/mac-arm64',
    })
    expect(resolveDesktopUploadConfig({
      MATRESHKA_API_ORIGIN: 'https://desktop-updates.example.com/',
      DOWNLOAD_TEST_COS_BUCKET: 'test-download-bucket',
    }, 'darwin', 'arm64')).toMatchObject({
      bucket: 'test-download-bucket',
      secretIdEnvName: 'DOWNLOAD_TEST_COS_SECRET_ID',
      secretKeyEnvName: 'DOWNLOAD_TEST_COS_SECRET_KEY',
      publicUrl: 'https://desktop-updates.example.com/v1/updates/desktop/mac-arm64/',
    })
  })

  it('selects the production COS bucket without using the DeepSeek download host', () => {
    expect(resolveDesktopAutoUpdateConfig({
      DSH_DESKTOP_AUTO_UPDATE_ENV: 'production',
    }, 'win32', 'x64')).toMatchObject({
      environment: 'production',
      target: 'win-x64',
      publicUrl: `${DEFAULT_MATRESHKA_API_ORIGIN}/v1/updates/desktop/win-x64/`,
    })
    expect(resolveDesktopUploadConfig({
      DSH_DESKTOP_AUTO_UPDATE_ENV: 'production',
      MATRESHKA_API_ORIGIN: 'https://api.example.com',
      DOWNLOAD_PROD_COS_BUCKET: 'production-download-bucket',
    }, 'win32', 'x64')).toMatchObject({
      bucket: 'production-download-bucket',
      secretIdEnvName: 'DOWNLOAD_PROD_COS_SECRET_ID',
      secretKeyEnvName: 'DOWNLOAD_PROD_COS_SECRET_KEY',
      publicUrl: 'https://api.example.com/v1/updates/desktop/win-x64/',
    })
  })

  it('requires a COS bucket only for uploads', () => {
    expect(() => resolveDesktopUploadConfig({
      MATRESHKA_API_ORIGIN: 'https://desktop-updates.example.com',
    }, 'darwin', 'arm64')).toThrow(/DOWNLOAD_TEST_COS_BUCKET/u)
    expect(() => resolveDesktopUploadConfig({
      DSH_DESKTOP_AUTO_UPDATE_ENV: 'production',
    }, 'win32', 'x64')).toThrow(/DOWNLOAD_PROD_COS_BUCKET/u)
  })

  it('rejects an origin that is not a bare HTTP URL', () => {
    expect(() => resolveDesktopAutoUpdateConfig({
      MATRESHKA_API_ORIGIN: 'https://desktop-updates.example.com/releases',
    }, 'darwin', 'arm64')).toThrow(/HTTP origin without a path/u)
    expect(() => resolveDesktopAutoUpdateConfig({
      MATRESHKA_API_ORIGIN: 'ftp://desktop-updates.example.com',
    }, 'darwin', 'arm64')).toThrow(/HTTP origin/u)
  })

  it('rejects unknown deployments and targets', () => {
    expect(() => resolveDesktopAutoUpdateEnvironment({
      DSH_DESKTOP_AUTO_UPDATE_ENV: 'staging',
    })).toThrow(/test.*production/u)
    expect(() => resolveDesktopAutoUpdateTarget('linux', 'x64')).toThrow(/unsupported target/u)
    expect(() => desktopBuildRecordFilename('linux-x64' as 'mac-arm64')).toThrow(/unsupported target/u)
  })

  it('names channel metadata files', () => {
    expect(desktopUpdateMetadataFilename('1.2.3', 'win32')).toBe('latest.yml')
    expect(desktopUpdateMetadataFilename('1.2.3', 'darwin')).toBe('latest-mac.yml')
  })
})
