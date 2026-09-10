import { describe, it, expect } from 'vitest'
import { formatTime, clampTime } from './time'

describe('formatTime', () => {
  it('форматирует секунды как м:сс', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(9)).toBe('0:09')
    expect(formatTime(75)).toBe('1:15')
    expect(formatTime(600)).toBe('10:00')
  })
  it('терпит мусор', () => {
    expect(formatTime(NaN)).toBe('0:00')
    expect(formatTime(-5)).toBe('0:00')
  })
})

describe('clampTime', () => {
  it('держит позицию внутри длительности', () => {
    expect(clampTime(50, 100)).toBe(50)
    expect(clampTime(-10, 100)).toBe(0)
    expect(clampTime(150, 100)).toBe(100)
  })
  it('без известной длительности только не пускает ниже нуля', () => {
    expect(clampTime(150, 0)).toBe(150)
    expect(clampTime(-1, 0)).toBe(0)
  })
})
