/**
 * Ограничение попыток входа: без него пароль родителя перебирается бесконечно,
 * а после выхода в интернет это уже не теория.
 *
 * Состояние живёт в памяти процесса — этого достаточно для одной семьи на одной
 * машине. При перезапуске счётчики обнуляются; для нескольких инстансов
 * понадобится общее хранилище.
 */

export const MAX_FAILURES = 5
export const BLOCK_MS = 15 * 60 * 1000

export type ThrottleState = { failures: number[] }

export function registerFailure(state: ThrottleState | undefined, now: number): ThrottleState {
  const recent = (state?.failures ?? []).filter((t) => now - t < BLOCK_MS)
  return { failures: [...recent, now] }
}

export function checkThrottle(
  state: ThrottleState | undefined,
  now: number,
): { blocked: boolean; retryAfterSec: number } {
  const recent = (state?.failures ?? []).filter((t) => now - t < BLOCK_MS)
  if (recent.length < MAX_FAILURES) return { blocked: false, retryAfterSec: 0 }
  const until = Math.max(...recent) + BLOCK_MS
  return { blocked: true, retryAfterSec: Math.max(1, Math.ceil((until - now) / 1000)) }
}

const states = new Map<string, ThrottleState>()

export function throttleFor(key: string) {
  return {
    check: (now = Date.now()) => checkThrottle(states.get(key), now),
    fail: (now = Date.now()) => states.set(key, registerFailure(states.get(key), now)),
    reset: () => states.delete(key),
  }
}
