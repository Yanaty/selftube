import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireParent } from '@/lib/session'
import { getAdminSource, listAdminSourceVideos } from '@/domain/catalog/catalog-service'
import { setVideoHiddenAction, setFoundHiddenAction } from '../../../actions'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 60

export default async function SourceVideosPage({
  params, searchParams,
}: {
  params: { sourceId: string }
  searchParams: { q?: string; p?: string }
}) {
  const parent = await requireParent()
  const source = await getAdminSource(parent.accountId, params.sourceId)
  if (!source) notFound()

  const query = searchParams.q ?? ''
  const page = Math.max(1, Math.floor(Number(searchParams.p ?? '1')) || 1)
  const { items, total, hidden } = await listAdminSourceVideos(parent.accountId, source.id, {
    offset: (page - 1) * PAGE_SIZE,
    limit: PAGE_SIZE,
    query,
  })
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const path = `/admin/source/${source.id}`
  const pageHref = (p: number) => `${path}?p=${p}${query ? `&q=${encodeURIComponent(query)}` : ''}`

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin" className="text-xs text-gray-500 hover:underline">← Каталог</Link>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-lg font-extrabold">{source.title}</h1>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${source.kind === 'PLAYLIST' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
            {source.kind === 'PLAYLIST' ? 'Плейлист' : 'Канал'}
          </span>
        </div>
        <p className="text-xs text-gray-500">
          {total} видео{query ? ' по запросу' : ''} · скрыто {hidden}
        </p>
      </div>

      <form action={path} className="flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Поиск по названию…"
          className="flex-1 rounded-lg border p-2 text-sm"
        />
        <button className="rounded-lg bg-gray-700 px-4 py-2 text-sm text-white">Найти</button>
        {query ? <Link href={path} className="self-center text-xs text-gray-500 hover:underline">Сбросить</Link> : null}
      </form>

      {query && total > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed bg-gray-50 p-3 text-sm">
          <span className="text-gray-600">Со всеми найденными ({total}):</span>
          <form action={setFoundHiddenAction}>
            <input type="hidden" name="sourceId" value={source.id} />
            <input type="hidden" name="q" value={query} />
            <input type="hidden" name="hidden" value="1" />
            <button className="rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-bold text-white">Скрыть все</button>
          </form>
          <form action={setFoundHiddenAction}>
            <input type="hidden" name="sourceId" value={source.id} />
            <input type="hidden" name="q" value={query} />
            <input type="hidden" name="hidden" value="0" />
            <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-700">Показать все</button>
          </form>
          <span className="text-xs text-gray-400">Действие обратимо</span>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-gray-400">Ничего не нашлось</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {items.map((v) => (
            <div key={v.id} className={`rounded-xl border bg-white p-2 ${v.hidden ? 'opacity-60' : ''}`}>
              <div className="relative">
                <img src={v.thumbnailUrl} alt="" className="aspect-video w-full rounded-lg bg-gray-100 object-cover" />
                {v.hidden ? (
                  <span className="absolute left-1 top-1 rounded bg-gray-900/80 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                    Скрыто
                  </span>
                ) : null}
              </div>
              <div className="mt-1 line-clamp-2 text-xs font-semibold">{v.title}</div>
              {/* Удаления здесь намеренно нет: видео вернётся при первой же
                  синхронизации, скрытие — единственный работающий способ. */}
              <form action={setVideoHiddenAction} className="mt-1">
                <input type="hidden" name="videoId" value={v.id} />
                <input type="hidden" name="hidden" value={v.hidden ? '0' : '1'} />
                <input type="hidden" name="path" value={path} />
                <button className="text-xs font-semibold text-blue-600">{v.hidden ? 'Показать' : 'Скрыть'}</button>
              </form>
            </div>
          ))}
        </div>
      )}

      {lastPage > 1 ? (
        <div className="flex items-center justify-center gap-4 text-sm">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="rounded-lg border px-3 py-1.5 hover:bg-gray-100">← Назад</Link>
          ) : null}
          <span className="text-xs text-gray-500">Страница {page} из {lastPage}</span>
          {page < lastPage ? (
            <Link href={pageHref(page + 1)} className="rounded-lg border px-3 py-1.5 hover:bg-gray-100">Вперёд →</Link>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
