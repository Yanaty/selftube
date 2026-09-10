'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SafePlayer } from '@/components/SafePlayer/SafePlayer'

type Suggestion = { id: string; title: string; thumbnailUrl: string }

export function WatchClient({ embedUrl, durationSec, suggestions, initiallyBlocked }: {
  embedUrl: string; durationSec: number; suggestions: Suggestion[]; initiallyBlocked: boolean
}) {
  const router = useRouter()
  const [ended, setEnded] = useState(false)
  const [blocked, setBlocked] = useState(initiallyBlocked)

  const onTick = useCallback(async (seconds: number) => {
    const res = await fetch('/api/heartbeat', { method: 'POST', body: JSON.stringify({ seconds }) })
    const json = await res.json()
    if (json.blocked) setBlocked(true)
  }, [])

  if (blocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-amber-50 p-6 text-center">
        <div className="text-2xl font-extrabold text-gray-800">На сегодня всё! ⏰</div>
        <p className="mt-2 text-gray-600">Время просмотра на сегодня закончилось.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-3">
      <button onClick={() => router.push('/')} className="mb-3 rounded-full bg-white px-4 py-1.5 text-sm font-bold shadow">‹ Назад</button>
      {!ended ? (
        <SafePlayer embedUrl={embedUrl} durationSec={durationSec} onEnded={() => setEnded(true)} onTick={onTick} />
      ) : (
        <div className="rounded-2xl bg-amber-100 p-5">
          <div className="text-center text-lg font-extrabold text-gray-800">🎉 Видео закончилось!</div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {suggestions.map((s) => (
              <button key={s.id} onClick={() => router.push(`/watch/${s.id}`)} className="rounded-2xl bg-white p-1.5 text-left shadow">
                <img src={s.thumbnailUrl} alt="" className="h-20 w-full rounded-xl object-cover" />
                <div className="mt-1 line-clamp-2 px-1 text-xs font-bold">{s.title}</div>
              </button>
            ))}
          </div>
          <div className="mt-3 text-center">
            <button onClick={() => setEnded(false)} className="rounded-full bg-orange-500 px-5 py-2 text-sm font-bold text-white">↺ Смотреть снова</button>
          </div>
        </div>
      )}
    </div>
  )
}
