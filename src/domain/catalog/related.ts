import { shuffle } from './shuffle'

/**
 * Подбор похожих видео по словам названия — чтобы после серии «Щенячьего патруля»
 * предлагался «Щенячий патруль», а не последнее добавленное видео.
 *
 * Морфологии здесь намеренно нет: слово обрезается до первых четырёх букв, и этого
 * хватает, чтобы «щенячий» и «щенячьи» встретились. Служебные слова выкинуты —
 * без этого «1 сезон 2 серия» роднит между собой вообще все мультсериалы.
 */

const STEM_LEN = 4

// Стемы (первые 4 буквы) слов, которые есть в половине детских названий и потому
// ничего не говорят о теме: «сезон», «серия», «мультик», «смотреть», «сборник»…
const STOP_STEMS = new Set([
  'сезо', 'сери', 'муль', 'смот', 'онла', 'подр', 'сбор', 'част', 'нова', 'новы',
  'дете', 'детс', 'скач', 'бесп', 'полн', 'лучш', 'русс', 'озву', 'выпу', 'сюже',
  'вида', 'виде', 'friv', 'full',
])

export function titleStems(title: string): string[] {
  const words = title
    .toLowerCase()
    .replace(/ё/g, 'е')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)

  const stems: string[] = []
  for (const word of words) {
    if (word.length < STEM_LEN) continue
    if (/^\d+$/.test(word)) continue
    const stem = word.slice(0, STEM_LEN)
    if (STOP_STEMS.has(stem)) continue
    if (!stems.includes(stem)) stems.push(stem)
  }
  return stems
}

type Titled = { id: string; title: string }

/**
 * Возвращает до `count` видео: сначала совпадающие по словам названия (чем больше
 * общих слов, тем выше), затем — случайные, чтобы добить до нужного числа.
 */
export function pickRelated<T extends Titled>(
  current: Titled,
  catalog: readonly T[],
  count: number,
  rng: () => number = Math.random,
): T[] {
  const others = catalog.filter((v) => v.id !== current.id)
  const currentStems = new Set(titleStems(current.title))

  const scored = others
    .map((video) => ({ video, score: titleStems(video.title).filter((s) => currentStems.has(s)).length }))
    .filter((x) => x.score > 0)
  // Перемешиваем до сортировки: при равном числе совпадений порядок будет разным
  // от захода к заходу, и подборка не выглядит застывшей.
  const related = shuffle(scored, rng)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.video)

  if (related.length >= count) return related.slice(0, count)

  const chosen = new Set(related.map((v) => v.id))
  const filler = shuffle(others.filter((v) => !chosen.has(v.id)), rng)
  return [...related, ...filler].slice(0, count)
}
