/**
 * Перемешивание Фишера–Йетса. rng инъектируется, чтобы порядок был проверяем тестом,
 * а сама функция оставалась чистой: исходный список не меняется.
 */
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}
