import type { ReactNode } from 'react'

/**
 * Общая ширина детских экранов. Шапка, сетка видео и результаты поиска должны
 * начинаться и заканчиваться на одной вертикали — иначе строка поиска тянется
 * шире карточек и рассинхрон бросается в глаза.
 */
export function KidsContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1800px] px-3 sm:px-4 ${className}`}>{children}</div>
}
