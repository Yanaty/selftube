import Link from 'next/link'

export function VideoCard({ id, title, thumbnailUrl }: { id: string; title: string; thumbnailUrl: string }) {
  return (
    <Link href={`/watch/${id}`} className="block rounded-2xl bg-white p-1.5 shadow">
      <img src={thumbnailUrl} alt="" className="h-28 w-full rounded-xl object-cover" />
      <div className="mt-1 line-clamp-2 px-1 text-sm font-bold text-gray-800">{title}</div>
    </Link>
  )
}
