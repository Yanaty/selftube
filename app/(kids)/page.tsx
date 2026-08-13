import { getCurrentAccountId } from '@/lib/account'
import { listChildCatalog } from '@/domain/catalog/catalog-service'
import { getStatus } from '@/domain/timelimit/timelimit-service'
import { KidsHeader } from '@/components/kids/KidsHeader'
import { VideoCard } from '@/components/kids/VideoCard'

export const dynamic = 'force-dynamic'

export default async function KidsHome() {
  const accountId = await getCurrentAccountId()
  const [videos, status] = await Promise.all([listChildCatalog(accountId), getStatus(accountId)])
  const remMin = status.dailyLimitMinutes === null ? null : Math.ceil(status.remainingSeconds / 60)
  return (
    <div>
      <KidsHeader remainingMinutes={remMin} />
      <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-4">
        {videos.map((v) => <VideoCard key={v.id} id={v.id} title={v.title} thumbnailUrl={v.thumbnailUrl} />)}
      </div>
      {videos.length === 0 ? <p className="p-6 text-center text-gray-500">Пока нет видео. Попроси родителя добавить 🙂</p> : null}
    </div>
  )
}
