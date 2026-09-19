import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest): NextResponse {
  const locale = request.nextUrl.pathname === '/en' || request.nextUrl.pathname.startsWith('/en/')
    ? 'en'
    : 'ru'
  const headers = new Headers(request.headers)
  headers.set('x-locale', locale)
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/', '/en', '/en/:path*', '/matrena'],
}
