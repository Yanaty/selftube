'use server'
import { revalidatePath } from 'next/cache'
import { requireParent } from '@/lib/session'
import { setDailyLimit } from '@/domain/timelimit/timelimit-service'

export async function saveLimit(formData: FormData) {
  const parent = await requireParent()
  const raw = String(formData.get('minutes') ?? '').trim()
  const minutes = raw === '' ? null : Math.max(0, parseInt(raw, 10) || 0)
  await setDailyLimit(parent.accountId, minutes)
  revalidatePath('/admin/settings')
}
