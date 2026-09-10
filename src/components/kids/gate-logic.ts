/**
 * Логика «родительской калитки»: скрытый вход в админку из установленного
 * приложения, где нет адресной строки.
 *
 * Пять быстрых нажатий по логотипу открывают вопрос на умножение. Вопрос здесь не
 * ради секретности (пароль всё равно спросят), а потому что сессия родителя живёт
 * днями: без него ребёнок, случайно повторивший жест, попал бы прямо в настройки.
 */

export const TAPS_NEEDED = 5
export const TAP_WINDOW_MS = 2000

export type Question = { a: number; b: number; answer: number }

/** Возвращает новый список нажатий и признак того, что серия набрана. */
export function pushTap(
  previous: readonly number[],
  now: number,
  opts: { windowMs?: number; needed?: number } = {},
): { taps: number[]; unlocked: boolean } {
  const windowMs = opts.windowMs ?? TAP_WINDOW_MS
  const needed = opts.needed ?? TAPS_NEEDED
  const taps = [...previous.filter((t) => now - t < windowMs), now]
  return taps.length >= needed ? { taps: [], unlocked: true } : { taps, unlocked: false }
}

/** Множители 3–9: таблица умножения, которую дошкольник ещё не знает. */
export function makeQuestion(rng: () => number = Math.random): Question {
  const pick = () => 3 + Math.floor(rng() * 7)
  const a = pick()
  const b = pick()
  return { a, b, answer: a * b }
}

export function isCorrect(input: string, question: Question): boolean {
  const raw = input.trim()
  if (!/^\d+$/.test(raw)) return false
  return Number(raw) === question.answer
}
