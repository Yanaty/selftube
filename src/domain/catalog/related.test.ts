import { describe, it, expect } from 'vitest'
import { pickRelated, titleStems } from './related'

const v = (id: string, title: string) => ({ id, title })

const PATROL_1 = v('p1', 'Щенячий патруль – 1 сезон 1 серия «Брызги во все стороны» / PAW Patrol')
const PATROL_2 = v('p2', 'Щенячий патруль – 11 сезон 26 серия «Щенки спасают котёнка» / PAW Patrol')
const MASHA = v('m1', 'Маша и Медведь – 1 сезон 2 серия «Следы невиданных зверей»')
const TRACTOR = v('t1', 'Синий трактор едет в гости')
const CARS = v('c1', 'Мультики про машинки: большая стройка')

describe('titleStems', () => {
  it('выкидывает служебные слова, числа и короткие предлоги', () => {
    expect(titleStems('Щенячий патруль – 1 сезон 1 серия «Брызги»')).toEqual(['щеня', 'патр', 'брыз'])
  })
  it('не различает регистр и букву ё', () => {
    expect(titleStems('КОТЁНОК')).toEqual(titleStems('котенок'))
  })
})

describe('pickRelated', () => {
  it('ставит вперёд видео из той же серии', () => {
    const out = pickRelated(PATROL_1, [MASHA, TRACTOR, PATROL_2, CARS], 2)
    expect(out[0].id).toBe('p2')
  })

  it('не считает похожими «сезон» и «серия» — иначе похоже всё подряд', () => {
    // У «Маши» с «Патрулём» общие только служебные слова, совпадений быть не должно.
    expect(pickRelated(PATROL_1, [MASHA], 5).every((x) => x.id === 'm1')).toBe(true)
    const out = pickRelated(PATROL_1, [MASHA, PATROL_2], 1)
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('p2')
  })

  it('добивает случайными, если похожих меньше, чем нужно', () => {
    const out = pickRelated(PATROL_1, [MASHA, TRACTOR, PATROL_2, CARS], 4)
    expect(out).toHaveLength(4)
    expect(out[0].id).toBe('p2')
    expect(out.map((x) => x.id).sort()).toEqual(['c1', 'm1', 'p2', 't1'])
  })

  it('никогда не предлагает то же самое видео', () => {
    const out = pickRelated(PATROL_1, [PATROL_1, PATROL_2, MASHA], 5)
    expect(out.map((x) => x.id)).not.toContain('p1')
  })

  it('возвращает столько, сколько есть, если каталог маленький', () => {
    expect(pickRelated(PATROL_1, [MASHA], 6)).toHaveLength(1)
    expect(pickRelated(PATROL_1, [], 6)).toEqual([])
  })

  it('порядок случайной части задаётся инъектированным rng', () => {
    const catalog = [MASHA, TRACTOR, CARS]
    const a = pickRelated(PATROL_1, catalog, 3, () => 0)
    const b = pickRelated(PATROL_1, catalog, 3, () => 0)
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id))
  })
})
