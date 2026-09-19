import type { Metadata } from 'next'
import { MatrenaPage } from '../../src/MatrenaPage'
import { ru } from '../../src/locales'

export const metadata: Metadata = {
  title: ru.pageMetaTitle,
  description: ru.pageMetaDescription,
}

export default function RussianMatrenaPage() {
  return (
    <MatrenaPage
      copy={ru}
      locale="ru"
      downloadUrl={process.env.MATRESHKA_WINDOWS_DOWNLOAD_URL ?? ''}
    />
  )
}
