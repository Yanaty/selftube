import { getCurrentAccountId } from '@/lib/account'
import { listChildCatalog } from '@/domain/catalog/catalog-service'
import { shuffle } from '@/domain/catalog/shuffle'
import { getStatus } from '@/domain/timelimit/timelimit-service'
import { KidsHeader } from '@/components/kids/KidsHeader'
import { VideoCard } from '@/components/kids/VideoCard'
import { KidsContainer } from '@/components/kids/KidsContainer'

export const dynamic = 'force-dynamic'

export default async function KidsHome() {
  const accountId = await getCurrentAccountId()
  const [catalog, status] = await Promise.all([listChildCatalog(accountId), getStatus(accountId)])
  // Каждая загрузка главной — свой порядок: иначе сверху вечно висят последние
  // добавленные, а старое ребёнок не видит. Страница force-dynamic, так что
  // перемешивание не закешируется.
  const videos = shuffle(catalog)
  const remMin = status.dailyLimitMinutes === null ? null : Math.ceil(status.remainingSeconds / 60)
  return (
    <div>
      <KidsHeader remainingMinutes={remMin} />
      <KidsContainer className="grid grid-cols-2 gap-3 py-3 sm:grid-cols-3 sm:gap-4 sm:py-4 xl:grid-cols-4 2xl:grid-cols-5">
        {videos.map((v) => <VideoCard key={v.id} id={v.id} title={v.title} thumbnailUrl={v.thumbnailUrl} />)}
      </KidsContainer>
      {videos.length === 0 ? <p className="p-6 text-center text-gray-500">Пока нет видео. Попроси родителя добавить 🙂</p> : null}
    </div>
  )
}
