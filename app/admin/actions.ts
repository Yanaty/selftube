'use server'
import { revalidatePath } from 'next/cache'
import { requireParent } from '@/lib/session'
import { adapterForUrl, adapterForPlatform } from '@/domain/platform/registry'
import { addVideoByUrl, addSourceByUrl, setVideoHidden, deleteManualVideo, deleteChannel } from '@/domain/catalog/catalog-service'
import { syncAllChannels } from '@/domain/sync/sync-service'

export async function addByUrl(_prev: unknown, formData: FormData) {
  const parent = await requireParent()
  const url = String(formData.get('url') ?? '').trim()
  const adapter = adapterForUrl(url)
  if (!adapter) return { error: 'Пока поддерживается только Rutube. Проверьте ссылку.' }
  try {
    const res = await adapter.resolve(url)
    if (res.kind === 'video') await addVideoByUrl(parent.accountId, url, adapter)
    else await addSourceByUrl(parent.accountId, url, adapter)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Не удалось добавить ссылку' }
  }
  revalidatePath('/admin')
  return { error: '' }
}

export async function syncNow() {
  const parent = await requireParent()
  const adapter = adapterForPlatform('RUTUBE')!
  await syncAllChannels(parent.accountId, adapter)
  revalidatePath('/admin')
}

export async function setVideoHiddenAction(formData: FormData) {
  const parent = await requireParent()
  await setVideoHidden(parent.accountId, String(formData.get('videoId')), formData.get('hidden') === '1')
  revalidatePath('/admin')
}

export async function deleteManualVideoAction(formData: FormData) {
  const parent = await requireParent()
  await deleteManualVideo(parent.accountId, String(formData.get('videoId')))
  revalidatePath('/admin')
}

export async function deleteChannelAction(formData: FormData) {
  const parent = await requireParent()
  await deleteChannel(parent.accountId, String(formData.get('channelId')))
  revalidatePath('/admin')
}
