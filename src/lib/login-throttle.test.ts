import { describe, it, expect } from 'vitest'
import { checkThrottle, registerFailure, MAX_FAILURES, BLOCK_MS } from './login-throttle'

const NOW = 1_700_000_000_000

describe('ограничение попыток входа', () => {
  it('пускает, пока попыток мало', () => {
    let state
    for (let i = 0; i < MAX_FAILURES - 1; i++) state = registerFailure(state, NOW + i)
    expect(checkThrottle(state, NOW).blocked).toBe(false)
  })

  it('блокирует после исчерпания попыток', () => {
    let state
    for (let i = 0; i < MAX_FAILURES; i++) state = registerFailure(state, NOW + i)
    const check = checkThrottle(state, NOW)
    expect(check.blocked).toBe(true)
    expect(check.retryAfterSec).toBeGreaterThan(0)
  })

  it('отпускает, когда блокировка истекла', () => {
    let state
    for (let i = 0; i < MAX_FAILURES; i++) state = registerFailure(state, NOW + i)
    expect(checkThrottle(state, NOW + BLOCK_MS + 1).blocked).toBe(false)
  })

  it('редкие ошибки не копятся — старые попытки забываются', () => {
    let state
    for (let i = 0; i < MAX_FAILURES * 3; i++) {
      state = registerFailure(state, NOW + i * (BLOCK_MS + 1000))
      expect(checkThrottle(state, NOW + i * (BLOCK_MS + 1000)).blocked).toBe(false)
    }
  })
})
