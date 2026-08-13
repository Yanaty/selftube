import { db } from '@/lib/db'
import type { PlatformAdapter, PlatformVideo } from '@/domain/platform/types'
import { isVisibleToChild } from './visibility'

async function upsertVideo(
  accountId: string, v: PlatformVideo,
  sourceType: 'MANUAL' | 'CHANNEL', channelId: string | null,
) {
  return db.video.upsert({
    where: { accountId_platform_platformVideoId: { accountId, platform: v.platform, platformVideoId: v.platformVideoId } },
    update: { title: v.title, thumbnailUrl: v.thumbnailUrl, durationSec: v.durationSec, embedUrl: v.embedUrl, publishedAt: v.publishedAt },
    create: {
      accountId, platform: v.platform, platformVideoId: v.platformVideoId,
      title: v.title, thumbnailUrl: v.thumbnailUrl, durationSec: v.durationSec,
      embedUrl: v.embedUrl, sourceType, channelId, publishedAt: v.publishedAt,
    },
  })
}

export async function addVideoByUrl(accountId: string, url: string, adapter: PlatformAdapter) {
  const res = await adapter.resolve(url)
  if (res.kind !== 'video') throw new Error('Ссылка ведёт на канал, а не на видео')
  return upsertVideo(accountId, res.video, 'MANUAL', null)
}

export async function addChannelByUrl(accountId: string, url: string, adapter: PlatformAdapter) {
  const res = await adapter.resolve(url)
  if (res.kind !== 'channel') throw new Error('Ссылка ведёт на видео, а не на канал')
  const channel = await db.channel.upsert({
    where: { accountId_platform_platformChannelId: { accountId, platform: res.channel.platform, platformChannelId: res.channel.platformChannelId } },
    update: { title: res.channel.title, thumbnailUrl: res.channel.thumbnailUrl },
    create: { accountId, platform: res.channel.platform, platformChannelId: res.channel.platformChannelId, title: res.channel.title, thumbnailUrl: res.channel.thumbnailUrl },
  })
  const videos = await adapter.listChannelVideos(res.channel.platformChannelId)
  for (const v of videos) await upsertVideo(accountId, v, 'CHANNEL', channel.id)
  await db.channel.update({ where: { id: channel.id }, data: { lastSyncedAt: new Date() } })
  return channel
}

export async function listChildCatalog(accountId: string) {
  const videos = await db.video.findMany({
    where: { accountId },
    include: { channel: true },
    orderBy: { addedAt: 'desc' },
  })
  return videos.filter((v) =>
    isVisibleToChild({
      hidden: v.hidden,
      sourceType: v.sourceType as 'MANUAL' | 'CHANNEL',
      channelEnabled: v.channel?.enabled ?? true,
    }),
  )
}

export async function searchChildCatalog(accountId: string, query: string) {
  const all = await listChildCatalog(accountId)
  const q = query.trim().toLowerCase()
  if (!q) return all
  return all.filter((v) => v.title.toLowerCase().includes(q))
}

export async function hideVideo(accountId: string, videoId: string) {
  await db.video.updateMany({ where: { id: videoId, accountId }, data: { hidden: true } })
}

export async function listAdminChannels(accountId: string) {
  return db.channel.findMany({
    where: { accountId },
    orderBy: { addedAt: 'desc' },
    include: { _count: { select: { videos: true } } },
  })
}

export async function listAdminManualVideos(accountId: string) {
  return db.video.findMany({ where: { accountId, sourceType: 'MANUAL' }, orderBy: { addedAt: 'desc' } })
}

export async function deleteChannel(accountId: string, channelId: string) {
  await db.video.deleteMany({ where: { accountId, channelId } })
  await db.channel.deleteMany({ where: { id: channelId, accountId } })
}
