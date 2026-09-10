/**
 * Детерминированный генератор (mulberry32). Нужен для пагинации случайного
 * порядка: главная перемешивается заново на каждый заход, но пока ребёнок жмёт
 * «Ещё», порядок обязан оставаться прежним — иначе одни видео придут дважды, а
 * другие не придут вовсе. Зерно живёт на клиенте и уезжает вместе с запросом.
 */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomSeed(): number {
  return 1 + Math.floor(Math.random() * 0xffffffe)
}
