'use server'
import { getCurrentAccountId } from '@/lib/account'
import { listChildCatalogPage } from '@/domain/catalog/catalog-service'

const MAX_LIMIT = 120

/** Следующая порция карточек для кнопки «Ещё». */
export async function loadMoreVideos(seed: number, offset: number, limit: number, query: string) {
  const accountId = await getCurrentAccountId()
  const { items } = await listChildCatalogPage(accountId, {
    seed,
    offset: Math.max(0, Math.floor(offset)),
    limit: Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit))),
    query,
  })
  return items
}
