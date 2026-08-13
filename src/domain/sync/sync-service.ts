import { db } from '@/lib/db'
import type { PlatformAdapter } from '@/domain/platform/types'

// Синхронизирует один канал: добавляет новые видео, обновляет метаданные,
// НЕ трогает поле hidden у существующих (уважает решение родителя).
export async function syncChannel(accountId: string, channelId: string, adapter: PlatformAdapter) {
  const channel = await db.channel.findFirst({ where: { id: channelId, accountId } })
  if (!channel) throw new Error('Канал не найден')

  const videos = await adapter.listChannelVideos(channel.platformChannelId)
  for (const v of videos) {
    await db.video.upsert({
      where: { accountId_platform_platformVideoId: { accountId, platform: v.platform, platformVideoId: v.platformVideoId } },
      // update НЕ содержит hidden — скрытое остаётся скрытым
      update: { title: v.title, thumbnailUrl: v.thumbnailUrl, durationSec: v.durationSec, embedUrl: v.embedUrl, publishedAt: v.publishedAt },
      create: {
        accountId, platform: v.platform, platformVideoId: v.platformVideoId,
        title: v.title, thumbnailUrl: v.thumbnailUrl, durationSec: v.durationSec,
        embedUrl: v.embedUrl, sourceType: 'CHANNEL', channelId: channel.id, publishedAt: v.publishedAt,
      },
    })
  }
  await db.channel.update({ where: { id: channel.id }, data: { lastSyncedAt: new Date() } })
  return { synced: videos.length }
}

export async function syncAllChannels(accountId: string, adapter: PlatformAdapter) {
  const channels = await db.channel.findMany({ where: { accountId, enabled: true } })
  let total = 0
  for (const c of channels) {
    const r = await syncChannel(accountId, c.id, adapter)
    total += r.synced
  }
  return { channels: channels.length, videos: total }
}
