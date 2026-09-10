import { KidsContainer } from './KidsContainer'
import { KidsLogo } from './KidsLogo'

export function KidsHeader({ remainingMinutes }: { remainingMinutes: number | null }) {
  return (
    <div className="sticky top-0 z-10 bg-amber-100">
      <KidsContainer className="flex items-center gap-2 py-3">
        {/* Логотип — та же картинка, что и ярлык приложения; в нём же спрятан вход
            в админку (пять быстрых нажатий). */}
        <KidsLogo />
        <form action="/search" className="flex-1">
          <input name="q" placeholder="🔍 Что посмотрим?" className="w-full rounded-xl bg-white px-4 py-2 text-sm" />
        </form>
        {remainingMinutes !== null ? (
          <span className="rounded-xl bg-green-500 px-3 py-1.5 text-xs font-bold text-white">⏱ {remainingMinutes} мин</span>
        ) : null}
      </KidsContainer>
    </div>
  )
}
