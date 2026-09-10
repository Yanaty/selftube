export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const mm = Math.floor(total / 60)
  const ss = total % 60
  return `${mm}:${String(ss).padStart(2, '0')}`
}

// duration === 0 означает «длительность ещё неизвестна» — тогда ограничиваем только снизу.
export function clampTime(time: number, duration: number): number {
  if (!Number.isFinite(time) || time < 0) return 0
  if (duration > 0 && time > duration) return duration
  return time
}
