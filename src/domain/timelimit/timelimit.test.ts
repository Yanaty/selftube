import { describe, it, expect } from 'vitest'
import { remainingSeconds, isBlocked, todayKey } from './timelimit'

describe('timelimit', () => {
  it('без лимита — не блокирует, остаток бесконечный', () => {
    expect(isBlocked(null, 99999)).toBe(false)
    expect(remainingSeconds(null, 99999)).toBe(Infinity)
  })
  it('считает остаток', () => {
    expect(remainingSeconds(30, 120)).toBe(30 * 60 - 120)
  })
  it('блокирует при достижении лимита', () => {
    expect(isBlocked(10, 10 * 60)).toBe(true)
    expect(isBlocked(10, 10 * 60 - 1)).toBe(false)
  })
  it('остаток не бывает отрицательным', () => {
    expect(remainingSeconds(10, 10 * 60 + 500)).toBe(0)
  })
  it('todayKey форматирует YYYY-MM-DD', () => {
    expect(todayKey(new Date('2026-08-13T10:00:00Z'))).toBe('2026-08-13')
  })
})
