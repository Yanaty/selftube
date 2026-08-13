import type { ReactNode } from 'react'
import Link from 'next/link'
import { requireParent } from '@/lib/session'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireParent()
  return (
    <div className="flex min-h-screen">
      <aside className="w-44 bg-gray-900 p-4 text-gray-200">
        <div className="mb-4 font-extrabold text-white">SelfTube <span className="text-xs text-gray-400">admin</span></div>
        <nav className="space-y-1 text-sm">
          <Link href="/admin" className="block rounded px-2 py-1 hover:bg-gray-800">📺 Каталог</Link>
          <Link href="/admin/settings" className="block rounded px-2 py-1 hover:bg-gray-800">⚙️ Настройки</Link>
          <form action="/admin/logout" method="post"><button className="mt-4 block px-2 py-1 text-left">🚪 Выйти</button></form>
        </nav>
      </aside>
      <main className="flex-1 bg-gray-50 p-6">{children}</main>
    </div>
  )
}
