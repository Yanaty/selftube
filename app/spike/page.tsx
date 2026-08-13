'use client'
import { SafePlayer } from '@/components/SafePlayer/SafePlayer'

// Temporary spike page for manual testing of SafePlayer. Removed in a later task.
// Real, currently-public Rutube video ID (Малышарики — kids' cartoon):
//   https://rutube.ru/video/973c0551b5fd94fc1e2107e249e60786/
export default function Spike() {
  const id = '973c0551b5fd94fc1e2107e249e60786'
  return (
    <div className="mx-auto max-w-2xl p-4">
      <SafePlayer embedUrl={`https://rutube.ru/play/embed/${id}`} onEnded={() => alert('ended')} />
    </div>
  )
}
