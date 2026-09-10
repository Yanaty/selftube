import Link from 'next/link'
import { TruckMark } from '@/components/kids/TruckMark'

/**
 * Сюда же попадает ребёнок, открывший ссылку на видео, которое родитель убрал из
 * каталога, — поэтому текст без упрёка и с одной понятной кнопкой.
 */
export default function NotFound() {
  return (
    <div className="pattern-kids flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="-rotate-6">
        <TruckMark size={132} className="rounded-3xl shadow-lg" />
      </div>
      <h1 className="text-2xl font-extrabold text-gray-800">Ой! Здесь пусто</h1>
      <p className="max-w-xs text-gray-600">
        Такой страницы нет. А ещё бывает, что видео убрали — тогда его больше не показать.
      </p>
      <Link
        href="/"
        className="rounded-2xl bg-orange-500 px-6 py-3 text-base font-extrabold text-white shadow"
      >
        Смотреть мультики
      </Link>
    </div>
  )
}
