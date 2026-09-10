import Link from 'next/link'
import { KidsContainer } from './KidsContainer'

export function KidsHeader({ remainingMinutes }: { remainingMinutes: number | null }) {
  return (
    <div className="sticky top-0 z-10 bg-amber-100">
      <KidsContainer className="flex items-center gap-2 py-3">
        {/* Тот же файл, что и иконка установленного приложения: ярлык на телефоне и
            логотип в шапке — одна картинка, чтобы ребёнок узнавал приложение. */}
        <Link href="/" aria-label="На главную" className="shrink-0">
          <img src="/icon-192.png" alt="" className="h-9 w-9 rounded-full" />
        </Link>
        <form action="/search" className="flex-1">
          <input name="q" placeholder="🔍 Что посмотрим?" className="w-full rounded-full bg-white px-4 py-2 text-sm" />
        </form>
        {remainingMinutes !== null ? (
          <span className="rounded-full bg-green-500 px-3 py-1.5 text-xs font-bold text-white">⏱ {remainingMinutes} мин</span>
        ) : null}
      </KidsContainer>
    </div>
  )
}
