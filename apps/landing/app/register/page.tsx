import { AuthPage } from '../../src/AuthPage'
import { ru } from '../../src/locales'

export default async function RussianRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const next = (await searchParams).next
  return (
    <AuthPage
      copy={ru}
      locale="ru"
      mode="register"
      apiOrigin={process.env.NEXT_PUBLIC_MATRESHKA_API_ORIGIN ?? 'http://127.0.0.1:8016'}
      desktopHandoff={next === 'desktop'}
    />
  )
}
