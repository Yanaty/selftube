import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getParentBySession, SESSION_COOKIE } from './auth'

export async function requireParent() {
  const token = cookies().get(SESSION_COOKIE)?.value ?? ''
  const parent = await getParentBySession(token)
  if (!parent) redirect('/admin/login')
  return parent
}
