'use server'
import { revalidatePath } from 'next/cache'
import { requireParent } from '@/lib/session'
import { cookies } from 'next/headers'
import { setDailyLimit } from '@/domain/timelimit/timelimit-service'
import { verifyParent, setParentPassword, SESSION_COOKIE } from '@/lib/auth'

export async function saveLimit(formData: FormData) {
  const parent = await requireParent()
  const raw = String(formData.get('minutes') ?? '').trim()
  const minutes = raw === '' ? null : Math.max(0, parseInt(raw, 10) || 0)
  await setDailyLimit(parent.accountId, minutes)
  revalidatePath('/admin/settings')
}

export async function changePassword(_prev: unknown, formData: FormData) {
  const parent = await requireParent()
  const current = String(formData.get('current') ?? '')
  const next = String(formData.get('next') ?? '')

  if (next.length < 8) return { error: 'Новый пароль должен быть не короче 8 символов', ok: '' }
  if (!(await verifyParent(parent.email, current))) return { error: 'Текущий пароль неверный', ok: '' }

  // Свою сессию сохраняем, остальные обрываем: если пароль меняют из-за утечки,
  // чужой вход должен закончиться.
  const mine = cookies().get(SESSION_COOKIE)?.value
  await setParentPassword(parent.id, next, mine)
  revalidatePath('/admin/settings')
  return { error: '', ok: 'Пароль изменён' }
}
