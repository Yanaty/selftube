'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { verifyParent, createSession, SESSION_COOKIE } from '@/lib/auth'

const schema = z.object({ email: z.string().email(), password: z.string().min(1) })

export async function login(_prev: unknown, formData: FormData) {
  const parsed = schema.safeParse({ email: formData.get('email'), password: formData.get('password') })
  if (!parsed.success) return { error: 'Введите корректный email и пароль' }
  const parent = await verifyParent(parsed.data.email, parsed.data.password)
  if (!parent) return { error: 'Неверный email или пароль' }
  const token = await createSession(parent.id)
  cookies().set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' })
  redirect('/admin')
}
