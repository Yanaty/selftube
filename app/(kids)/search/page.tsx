import { getCurrentAccountId } from '@/lib/account'
import { searchChildCatalog } from '@/domain/catalog/catalog-service'
import { getStatus } from '@/domain/timelimit/timelimit-service'
import { KidsHeader } from '@/components/kids/KidsHeader'
import { VideoCard } from '@/components/kids/VideoCard'
import { KidsContainer } from '@/components/kids/KidsContainer'

export const dynamic = 'force-dynamic'

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const accountId = await getCurrentAccountId()
  const q = searchParams.q ?? ''
  const [videos, status] = await Promise.all([searchChildCatalog(accountId, q), getStatus(accountId)])
  const remMin = status.dailyLimitMinutes === null ? null : Math.ceil(status.remainingSeconds / 60)
  return (
    <div>
      <KidsHeader remainingMinutes={remMin} />
      <KidsContainer className="pt-3">
        <p className="text-sm text-gray-600">Результаты по запросу «{q}»: {videos.length}</p>
      </KidsContainer>
      <KidsContainer className="grid grid-cols-2 gap-3 py-3 sm:grid-cols-3 sm:gap-4 sm:py-4 xl:grid-cols-4 2xl:grid-cols-5">
        {videos.map((v) => <VideoCard key={v.id} id={v.id} title={v.title} thumbnailUrl={v.thumbnailUrl} />)}
      </KidsContainer>
    </div>
  )
}
