import { getCurrentAccountId } from '@/lib/account'
import { listChildCatalogPage } from '@/domain/catalog/catalog-service'
import { randomSeed } from '@/domain/catalog/rng'
import { getStatus } from '@/domain/timelimit/timelimit-service'
import { KidsHeader } from '@/components/kids/KidsHeader'
import { KidsGrid } from '@/components/kids/KidsGrid'
import { loadMoreVideos } from './actions'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 60

export default async function KidsHome() {
  const accountId = await getCurrentAccountId()
  // Своё зерно на каждый заход: порядок новый, но пока ребёнок жмёт «Ещё»,
  // перемешивание остаётся тем же и видео не повторяются.
  const seed = randomSeed()
  const [page, status] = await Promise.all([
    listChildCatalogPage(accountId, { seed, offset: 0, limit: PAGE_SIZE }),
    getStatus(accountId),
  ])
  const remMin = status.dailyLimitMinutes === null ? null : Math.ceil(status.remainingSeconds / 60)
  return (
    <div>
      <KidsHeader remainingMinutes={remMin} />
      <KidsGrid
        initial={page.items}
        total={page.total}
        seed={seed}
        pageSize={PAGE_SIZE}
        loadMoreVideos={loadMoreVideos}
        emptyMessage="Пока нет видео. Попроси родителя добавить 🙂"
      />
    </div>
  )
}
