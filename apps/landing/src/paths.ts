/** Active landing locale. */
export type LandingLocale = 'ru' | 'en'

/** Marketing document the chrome is rendering. */
export type LandingDocument = 'home' | 'matrena'

/**
 * @param locale - active landing locale
 * @returns the home path for that locale
 */
export function homeHref(locale: LandingLocale): string {
  return locale === 'en' ? '/en' : '/'
}

/**
 * @param locale - active landing locale
 * @returns the Matrena evaluation path for that locale
 */
export function matrenaHref(locale: LandingLocale): string {
  return locale === 'en' ? '/en/matrena' : '/matrena'
}

/**
 * @param locale - active landing locale
 * @param document - current marketing document
 * @returns the same document in the other locale
 */
export function otherLocaleHref(locale: LandingLocale, document: LandingDocument): string {
  if (document === 'matrena') {
    return locale === 'ru' ? '/en/matrena' : '/matrena'
  }
  return locale === 'ru' ? '/en' : '/'
}

/**
 * @param locale - active landing locale
 * @param hash - in-page target on the home document
 * @returns a home path that opens that section
 */
export function homeSectionHref(locale: LandingLocale, hash: 'product' | 'plugins'): string {
  return `${homeHref(locale)}#${hash}`
}
