export function todayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function remainingSeconds(limitMinutes: number | null, secondsWatched: number): number {
  if (limitMinutes === null) return Infinity
  return Math.max(0, limitMinutes * 60 - secondsWatched)
}

export function isBlocked(limitMinutes: number | null, secondsWatched: number): boolean {
  return remainingSeconds(limitMinutes, secondsWatched) <= 0
}
