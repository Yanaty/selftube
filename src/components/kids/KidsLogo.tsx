'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { pushTap } from './gate-logic'
import { ParentGate } from './ParentGate'

/**
 * Логотип и одновременно скрытый вход в админку: в установленном приложении нет
 * адресной строки, поэтому /admin иначе не открыть. Пять быстрых нажатий →
 * вопрос для взрослых → админка.
 */
export function KidsLogo() {
  const pathname = usePathname()
  const router = useRouter()
  const taps = useRef<number[]>([])
  const [gateOpen, setGateOpen] = useState(false)

  function onTap() {
    const { taps: next, unlocked } = pushTap(taps.current, Date.now())
    taps.current = next
    if (unlocked) setGateOpen(true)
  }

  const icon = <img src="/icon-192.png" alt="" className="h-9 w-9 rounded-xl" />

  return (
    <>
      {pathname === '/' ? (
        // На главной логотип никуда не ведёт: иначе каждый тап перезагружал бы
        // страницу, и каталог перемешивался бы прямо под пальцем.
        <button type="button" onClick={onTap} aria-label="Логотип" className="shrink-0">
          {icon}
        </button>
      ) : (
        <Link href="/" aria-label="На главную" onClick={onTap} className="shrink-0">
          {icon}
        </Link>
      )}
      {gateOpen ? (
        <ParentGate onClose={() => setGateOpen(false)} onPass={() => router.push('/admin')} />
      ) : null}
    </>
  )
}
