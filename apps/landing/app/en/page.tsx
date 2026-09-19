import type { Metadata } from 'next'
import { LandingPage } from '../../src/LandingPage'
import { en } from '../../src/locales'

export const metadata: Metadata = {
  title: 'Matreshka',
  description: 'Say what you need done. Matrena will take it from there.',
}

export default function EnglishPage() {
  return (
    <LandingPage
      copy={en}
      locale="en"
      downloadUrl={process.env.MATRESHKA_WINDOWS_DOWNLOAD_URL ?? ''}
    />
  )
}
