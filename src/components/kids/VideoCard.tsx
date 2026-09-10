import Link from 'next/link'

export function VideoCard({ id, title, thumbnailUrl }: { id: string; title: string; thumbnailUrl: string }) {
  return (
    <Link href={`/watch/${id}`} className="block rounded-2xl bg-white p-1.5 shadow transition hover:shadow-lg sm:p-2">
      {/* Пропорция 16:9 вместо фиксированной высоты: превью растёт вместе с шириной
          карточки, поэтому на больших экранах оно крупное и ничего не обрезается. */}
      <img src={thumbnailUrl} alt="" className="aspect-video w-full rounded-xl bg-amber-100 object-cover" />
      <div className="mt-1 line-clamp-2 px-1 text-sm font-bold text-gray-800 sm:mt-2 sm:text-base lg:text-lg">{title}</div>
    </Link>
  )
}
