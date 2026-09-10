import { describe, it, expect } from 'vitest'
import { pushTap, makeQuestion, isCorrect, TAP_WINDOW_MS, TAPS_NEEDED } from './gate-logic'

describe('pushTap — счётчик быстрых нажатий', () => {
  it('открывает вход ровно на пятом нажатии', () => {
    let taps: number[] = []
    let unlocked = false
    for (let i = 0; i < TAPS_NEEDED; i++) {
      ;({ taps, unlocked } = pushTap(taps, 1000 + i * 200))
      if (i < TAPS_NEEDED - 1) expect(unlocked).toBe(false)
    }
    expect(unlocked).toBe(true)
  })

  it('не копит нажатия, растянутые во времени', () => {
    let taps: number[] = []
    let unlocked = false
    // Ребёнок тыкает в логотип раз в пару секунд — это не должно открывать админку.
    for (let i = 0; i < 12; i++) {
      ;({ taps, unlocked } = pushTap(taps, i * (TAP_WINDOW_MS + 500)))
      expect(unlocked).toBe(false)
    }
  })

  it('после открытия счётчик обнуляется', () => {
    let taps: number[] = []
    let unlocked = false
    for (let i = 0; i < TAPS_NEEDED; i++) ({ taps, unlocked } = pushTap(taps, 1000 + i * 100))
    expect(unlocked).toBe(true)
    expect(taps).toEqual([])
  })
})

describe('makeQuestion', () => {
  it('берёт множители из таблицы умножения, не тривиальные', () => {
    for (let i = 0; i < 50; i++) {
      const q = makeQuestion()
      expect(q.a).toBeGreaterThanOrEqual(3)
      expect(q.a).toBeLessThanOrEqual(9)
      expect(q.b).toBeGreaterThanOrEqual(3)
      expect(q.b).toBeLessThanOrEqual(9)
      expect(q.answer).toBe(q.a * q.b)
    }
  })

  it('множители задаются инъектированным rng', () => {
    expect(makeQuestion(() => 0)).toEqual({ a: 3, b: 3, answer: 9 })
    expect(makeQuestion(() => 0.999)).toEqual({ a: 9, b: 9, answer: 81 })
  })
})

describe('isCorrect', () => {
  const q = { a: 7, b: 8, answer: 56 }
  it('принимает верный ответ с лишними пробелами', () => {
    expect(isCorrect('56', q)).toBe(true)
    expect(isCorrect('  56 ', q)).toBe(true)
  })
  it('отклоняет неверный, пустой и нечисловой ввод', () => {
    expect(isCorrect('55', q)).toBe(false)
    expect(isCorrect('', q)).toBe(false)
    expect(isCorrect('   ', q)).toBe(false)
    expect(isCorrect('пять', q)).toBe(false)
    expect(isCorrect('56x', q)).toBe(false)
  })
})
