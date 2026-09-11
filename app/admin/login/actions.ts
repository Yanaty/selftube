'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { verifyParent, createSession, SESSION_COOKIE } from '@/lib/auth'
import { throttleFor } from '@/lib/login-throttle'

const schema = z.object({ email: z.string().email(), password: z.string().min(1) })

export async function login(_prev: unknown, formData: FormData) {
  const parsed = schema.safeParse({ email: formData.get('email'), password: formData.get('password') })
  if (!parsed.success) return { error: 'Введите корректный email и пароль' }
  // Перебор пароля родителя после выхода в интернет — не теория, поэтому считаем
  // неудачные попытки по email.
  const throttle = throttleFor(parsed.data.email.toLowerCase())
  const limit = throttle.check()
  if (limit.blocked) {
    return { error: `Слишком много попыток. Попробуйте через ${Math.ceil(limit.retryAfterSec / 60)} мин.` }
  }

  const parent = await verifyParent(parsed.data.email, parsed.data.password)
  if (!parent) {
    throttle.fail()
    return { error: 'Неверный email или пароль' }
  }
  throttle.reset()
  const token = await createSession(parent.id)
  cookies().set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' })
  redirect('/admin')
}
