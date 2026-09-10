import Link from 'next/link'

/** Отдельная 404 для админки: детская заглушка тут выглядела бы странно. */
export default function AdminNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 p-6 text-center">
      <h1 className="text-lg font-extrabold text-gray-800">Не найдено</h1>
      <p className="text-sm text-gray-500">Канала, плейлиста или страницы с таким адресом нет.</p>
      <Link href="/admin" className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-bold text-white">
        В каталог
      </Link>
    </div>
  )
}
