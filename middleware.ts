import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth-constants'

export function middleware(req: NextRequest) {
  const isLogin = req.nextUrl.pathname.startsWith('/admin/login')
  const hasCookie = req.cookies.has(SESSION_COOKIE)
  if (!isLogin && !hasCookie) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }
  return NextResponse.next()
}

export const config = { matcher: ['/admin/:path*'] }
