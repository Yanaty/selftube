import { getCurrentAccountId } from '@/lib/account'
import { listChildCatalogPage } from '@/domain/catalog/catalog-service'
import { randomSeed } from '@/domain/catalog/rng'
import { getStatus } from '@/domain/timelimit/timelimit-service'
import { KidsHeader } from '@/components/kids/KidsHeader'
import { KidsContainer } from '@/components/kids/KidsContainer'
import { KidsGrid } from '@/components/kids/KidsGrid'
import { loadMoreVideos } from '../actions'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 60

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const accountId = await getCurrentAccountId()
  const q = searchParams.q ?? ''
  const seed = randomSeed()
  const [page, status] = await Promise.all([
    listChildCatalogPage(accountId, { seed, offset: 0, limit: PAGE_SIZE, query: q }),
    getStatus(accountId),
  ])
  const remMin = status.dailyLimitMinutes === null ? null : Math.ceil(status.remainingSeconds / 60)
  return (
    <div>
      <KidsHeader remainingMinutes={remMin} />
      <KidsContainer className="pt-3">
        <p className="text-sm text-gray-600">Результаты по запросу «{q}»: {page.total}</p>
      </KidsContainer>
      <KidsGrid
        initial={page.items}
        total={page.total}
        seed={seed}
        pageSize={PAGE_SIZE}
        query={q}
        loadMoreVideos={loadMoreVideos}
        emptyMessage="Ничего не нашлось. Попробуй другое слово 🙂"
      />
    </div>
  )
}
