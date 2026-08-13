import type { PlatformAdapter } from './types'
import { RutubeAdapter } from './rutube/adapter'

// v1: только Rutube. Добавление платформы = добавить адаптер в массив.
const adapters: PlatformAdapter[] = [new RutubeAdapter()]

export function adapterForUrl(url: string): PlatformAdapter | null {
  return adapters.find((a) => a.matches(url)) ?? null
}

export function adapterForPlatform(platform: string): PlatformAdapter | null {
  return adapters.find((a) => a.platform === platform) ?? null
}
