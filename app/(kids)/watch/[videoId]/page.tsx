import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { getCurrentAccountId } from '@/lib/account'
import { listChildCatalog } from '@/domain/catalog/catalog-service'
import { pickRelated } from '@/domain/catalog/related'
import { isVisibleToChild } from '@/domain/catalog/visibility'
import { getStatus } from '@/domain/timelimit/timelimit-service'
import { WatchClient } from './WatchClient'

export const dynamic = 'force-dynamic'

export default async function WatchPage({ params }: { params: { videoId: string } }) {
  const accountId = await getCurrentAccountId()
  const video = await db.video.findFirst({ where: { id: params.videoId, accountId }, include: { channel: true } })
  // Та же проверка видимости, что и в каталоге: скрытые и видео выключенного канала
  // не должны открываться даже по прямой ссылке.
  if (
    !video ||
    !isVisibleToChild({
      hidden: video.hidden,
      sourceType: video.sourceType as 'MANUAL' | 'CHANNEL',
      channelEnabled: video.channel?.enabled ?? true,
    })
  ) {
    notFound()
  }

  const [catalog, status] = await Promise.all([listChildCatalog(accountId), getStatus(accountId)])
  // Похожее по словам названия, добитое случайными: после серии мультсериала
  // логичнее предложить его же продолжение, а не последнее добавленное видео.
  const suggestions = pickRelated(video, catalog, 6)
    .map((v) => ({ id: v.id, title: v.title, thumbnailUrl: v.thumbnailUrl }))

  return (
    <WatchClient
      embedUrl={video.embedUrl}
      durationSec={video.durationSec}
      suggestions={suggestions}
      initiallyBlocked={status.blocked}
    />
  )
}
