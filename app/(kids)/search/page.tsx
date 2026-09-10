import { getCurrentAccountId } from '@/lib/account'
import { searchChildCatalog } from '@/domain/catalog/catalog-service'
import { getStatus } from '@/domain/timelimit/timelimit-service'
import { KidsHeader } from '@/components/kids/KidsHeader'
import { VideoCard } from '@/components/kids/VideoCard'

export const dynamic = 'force-dynamic'

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const accountId = await getCurrentAccountId()
  const q = searchParams.q ?? ''
  const [videos, status] = await Promise.all([searchChildCatalog(accountId, q), getStatus(accountId)])
  const remMin = status.dailyLimitMinutes === null ? null : Math.ceil(status.remainingSeconds / 60)
  return (
    <div>
      <KidsHeader remainingMinutes={remMin} />
      <p className="px-4 pt-3 text-sm text-gray-600">Результаты по запросу «{q}»: {videos.length}</p>
      <div className="mx-auto grid max-w-screen-2xl grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:gap-4 sm:p-4 xl:grid-cols-4">
        {videos.map((v) => <VideoCard key={v.id} id={v.id} title={v.title} thumbnailUrl={v.thumbnailUrl} />)}
      </div>
    </div>
  )
}
