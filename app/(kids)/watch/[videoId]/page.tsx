import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { getCurrentAccountId } from '@/lib/account'
import { listChildCatalog } from '@/domain/catalog/catalog-service'
import { getStatus } from '@/domain/timelimit/timelimit-service'
import { WatchClient } from './WatchClient'

export const dynamic = 'force-dynamic'

export default async function WatchPage({ params }: { params: { videoId: string } }) {
  const accountId = await getCurrentAccountId()
  const video = await db.video.findFirst({ where: { id: params.videoId, accountId } })
  if (!video || video.hidden) notFound()

  const [catalog, status] = await Promise.all([listChildCatalog(accountId), getStatus(accountId)])
  const suggestions = catalog.filter((v) => v.id !== video.id).slice(0, 6)
    .map((v) => ({ id: v.id, title: v.title, thumbnailUrl: v.thumbnailUrl }))

  return (
    <WatchClient
      embedUrl={video.embedUrl}
      suggestions={suggestions}
      initiallyBlocked={status.blocked}
    />
  )
}
