import { describe, it, expect } from 'vitest'
import { seededRng, randomSeed } from './rng'
import { shuffle } from './shuffle'

describe('seededRng', () => {
  it('с одним и тем же зерном даёт одну и ту же последовательность', () => {
    const a = seededRng(42)
    const b = seededRng(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('с разными зёрнами — разные последовательности', () => {
    expect(seededRng(1)()).not.toBe(seededRng(2)())
  })

  it('выдаёт числа в диапазоне [0, 1)', () => {
    const rng = seededRng(7)
    for (let i = 0; i < 200; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('зерно + shuffle = устойчивая пагинация', () => {
  const catalog = Array.from({ length: 100 }, (_, i) => i)

  it('страницы одного зерна не теряют и не дублируют элементы', () => {
    const page = (offset: number, limit: number) => shuffle(catalog, seededRng(555)).slice(offset, offset + limit)
    const all = [...page(0, 60), ...page(60, 60)]
    expect(all).toHaveLength(100)
    expect(new Set(all).size).toBe(100)
  })

  it('другое зерно — другой порядок', () => {
    expect(shuffle(catalog, seededRng(1))).not.toEqual(shuffle(catalog, seededRng(2)))
  })
})

describe('randomSeed', () => {
  it('целое положительное число', () => {
    for (let i = 0; i < 20; i++) {
      const s = randomSeed()
      expect(Number.isInteger(s)).toBe(true)
      expect(s).toBeGreaterThan(0)
    }
  })
})
