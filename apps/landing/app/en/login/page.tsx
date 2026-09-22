import { AuthPage } from '../../../src/AuthPage'
import { en } from '../../../src/locales'

export default async function EnglishLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const next = (await searchParams).next
  return (
    <AuthPage
      copy={en}
      locale="en"
      mode="login"
      apiOrigin={process.env.NEXT_PUBLIC_MATRESHKA_API_ORIGIN ?? 'http://127.0.0.1:8016'}
      desktopHandoff={next === 'desktop'}
    />
  )
}
