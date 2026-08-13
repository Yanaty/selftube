import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { destroySession, SESSION_COOKIE } from '@/lib/auth'

export async function POST(req: Request) {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (token) await destroySession(token)
  cookies().delete(SESSION_COOKIE)
  return NextResponse.redirect(new URL('/admin/login', req.url))
}
