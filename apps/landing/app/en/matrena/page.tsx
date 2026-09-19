import type { Metadata } from 'next'
import { MatrenaPage } from '../../../src/MatrenaPage'
import { en } from '../../../src/locales'

export const metadata: Metadata = {
  title: en.pageMetaTitle,
  description: en.pageMetaDescription,
}

export default function EnglishMatrenaPage() {
  return (
    <MatrenaPage
      copy={en}
      locale="en"
      downloadUrl={process.env.MATRESHKA_WINDOWS_DOWNLOAD_URL ?? ''}
    />
  )
}
