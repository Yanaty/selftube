'use client'
import { useState, useTransition } from 'react'
import { KidsContainer } from './KidsContainer'
import { VideoCard } from './VideoCard'

export type GridVideo = { id: string; title: string; thumbnailUrl: string }

/**
 * Сетка каталога с догрузкой по кнопке. Каталог бывает в тысячи видео, поэтому
 * страница отдаёт первую порцию, а остальное приезжает по требованию — иначе
 * и payload страницы, и DOM растут пропорционально каталогу.
 */
export function KidsGrid({
  initial, total, seed, pageSize, query = '', emptyMessage, loadMoreVideos,
}: {
  initial: GridVideo[]
  total: number
  seed: number
  pageSize: number
  query?: string
  emptyMessage?: string
  /** Серверное действие приходит пропом — так же, как в админской форме. */
  loadMoreVideos: (seed: number, offset: number, limit: number, query: string) => Promise<GridVideo[]>
}) {
  const [videos, setVideos] = useState(initial)
  const [pending, startTransition] = useTransition()
  const remaining = total - videos.length

  function loadMore() {
    startTransition(async () => {
      const more = await loadMoreVideos(seed, videos.length, pageSize, query)
      setVideos((prev) => [...prev, ...more])
    })
  }

  if (total === 0) {
    return emptyMessage ? <p className="p-6 text-center text-gray-500">{emptyMessage}</p> : null
  }

  return (
    <>
      <KidsContainer className="grid grid-cols-2 gap-3 py-3 sm:grid-cols-3 sm:gap-4 sm:py-4 xl:grid-cols-4 2xl:grid-cols-5">
        {videos.map((v) => (
          <VideoCard key={v.id} id={v.id} title={v.title} thumbnailUrl={v.thumbnailUrl} />
        ))}
      </KidsContainer>
      {remaining > 0 ? (
        <div className="flex flex-col items-center gap-2 pb-8 pt-2">
          <button
            onClick={loadMore}
            disabled={pending}
            className="rounded-2xl bg-orange-500 px-6 py-3 text-base font-extrabold text-white shadow disabled:opacity-60"
          >
            {pending ? 'Загружаем…' : 'Ещё видео'}
          </button>
          <span className="text-xs text-gray-500">
            Показано {videos.length} из {total}
          </span>
        </div>
      ) : null}
    </>
  )
}
