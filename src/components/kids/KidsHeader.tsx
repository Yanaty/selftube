import Link from 'next/link'

export function KidsHeader({ remainingMinutes }: { remainingMinutes: number | null }) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 bg-amber-100 p-3">
      <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-lg">🦊</Link>
      <form action="/search" className="flex-1">
        <input name="q" placeholder="🔍 Что посмотрим?" className="w-full rounded-full bg-white px-4 py-2 text-sm" />
      </form>
      {remainingMinutes !== null ? (
        <span className="rounded-full bg-green-500 px-3 py-1.5 text-xs font-bold text-white">⏱ {remainingMinutes} мин</span>
      ) : null}
    </div>
  )
}
