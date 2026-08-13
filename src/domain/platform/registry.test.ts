import { describe, it, expect } from 'vitest'
import { adapterForUrl } from './registry'

describe('adapterForUrl', () => {
  it('возвращает Rutube-адаптер для rutube-ссылки', () => {
    expect(adapterForUrl('https://rutube.ru/video/x/')?.platform).toBe('RUTUBE')
  })
  it('возвращает null для неподдерживаемой ссылки', () => {
    expect(adapterForUrl('https://ok.ru/video/x')).toBeNull()
  })
})
