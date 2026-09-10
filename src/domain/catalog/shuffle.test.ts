import { describe, it, expect } from 'vitest'
import { shuffle } from './shuffle'

describe('shuffle', () => {
  it('не трогает исходный массив', () => {
    const src = ['a', 'b', 'c']
    shuffle(src)
    expect(src).toEqual(['a', 'b', 'c'])
  })

  it('возвращает ровно те же элементы, ничего не теряя и не дублируя', () => {
    const src = Array.from({ length: 50 }, (_, i) => i)
    expect([...shuffle(src)].sort((x, y) => x - y)).toEqual(src)
  })

  it('порядок задаётся инъектированным rng — Fisher–Yates', () => {
    // rng всегда 0 ⇒ на каждом шаге меняем текущий элемент с нулевым.
    expect(shuffle(['a', 'b', 'c'], () => 0)).toEqual(['b', 'c', 'a'])
  })

  it('терпит пустой список и список из одного элемента', () => {
    expect(shuffle([])).toEqual([])
    expect(shuffle(['x'])).toEqual(['x'])
  })
})
