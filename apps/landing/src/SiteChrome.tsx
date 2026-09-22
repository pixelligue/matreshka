import type { ReactNode } from 'react'
import type { LandingCopy } from './locales'
import {
  homeHref,
  homeSectionHref,
  loginHref,
  matrenaHref,
  otherLocaleHref,
  type LandingDocument,
  type LandingLocale,
} from './paths'

export const landingCtaClass =
  'inline-flex h-12 items-center justify-center rounded-full bg-[#17181c] px-6 text-[15px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60'

export interface SiteChromeProps {
  copy: LandingCopy
  locale: LandingLocale
  document: LandingDocument
  children: ReactNode
  /** Query string to keep on the other-locale link, including `?`. */
  query?: string
}

/**
 * Shared marketing chrome: header, page body, footer.
 * @param props - locale copy, current document, and page body
 * @returns the document frame
 */
export function SiteChrome({ copy, locale, document, children, query = '' }: SiteChromeProps): ReactNode {
  const home = homeHref(locale)
  const matrena = matrenaHref(locale)
  const otherHref = `${otherLocaleHref(locale, document)}${query}`
  const otherLabel = locale === 'ru' ? copy.langEn : copy.langRu

  return (
    <div className="min-h-[100dvh] bg-[#f6f7fb] text-[#12141a]">
      <header className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4">
        <a href={home} className="flex items-center gap-2 font-medium">
          <img src="/matreshka-logo.png" alt="" width={28} height={28} className="h-7 w-7 object-contain" />
          Matreshka
        </a>
        <nav className="hidden items-center gap-6 text-sm text-[#3d4450] md:flex">
          <a href={matrena}>{copy.navMatrena}</a>
          <a href={homeSectionHref(locale, 'product')}>{copy.navProduct}</a>
          <a href={homeSectionHref(locale, 'plugins')}>{copy.navPlugins}</a>
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <a
            href={loginHref(locale)}
            className="rounded-full px-3 py-1.5 text-[#3d4450] hover:bg-black/5"
          >
            {copy.navSignIn}
          </a>
          <a
            href={otherHref}
            hrefLang={locale === 'ru' ? 'en' : 'ru'}
            className="rounded-full px-3 py-1.5 text-[#3d4450] hover:bg-black/5"
          >
            {otherLabel}
          </a>
        </div>
      </header>
      {children}
      <footer className="border-t border-black/5 px-4 py-8 text-center text-sm text-[#5c6370]">
        {copy.footer}
      </footer>
    </div>
  )
}

/**
 * Windows download control. Stays visible when the installer URL is empty.
 * @param props - locale copy and optional installer URL
 * @returns a link or a disabled-looking control
 */
export function DownloadControl(props: { copy: LandingCopy; downloadUrl: string }): ReactNode {
  if (props.downloadUrl.length > 0) {
    return <a className={landingCtaClass} href={props.downloadUrl}>{props.copy.downloadWindows}</a>
  }
  return <span className={`${landingCtaClass} cursor-default`} aria-disabled="true">{props.copy.downloadWindows}</span>
}
