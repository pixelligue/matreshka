import { LandingPage } from '../src/LandingPage'
import { ru } from '../src/locales'

export default function RussianPage() {
  return (
    <LandingPage
      copy={ru}
      locale="ru"
      downloadUrl={process.env.MATRESHKA_WINDOWS_DOWNLOAD_URL ?? ''}
    />
  )
}
