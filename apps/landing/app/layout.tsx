import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Manrope } from 'next/font/google'
import { headers } from 'next/headers'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Matreshka',
  description: 'Скажите, что нужно сделать. Matrena разберётся.',
}

export default async function RootLayout({ children }: { children: ReactNode }): Promise<ReactNode> {
  const locale = (await headers()).get('x-locale') === 'en' ? 'en' : 'ru'
  return (
    <html lang={locale} className={manrope.className}>
      <body>{children}</body>
    </html>
  )
}
