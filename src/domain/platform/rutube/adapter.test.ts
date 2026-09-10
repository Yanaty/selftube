import { describe, it, expect } from 'vitest'
import { RutubeAdapter } from './adapter'

function fakeFetch(routes: Record<string, unknown>) {
  return async (url: string, _init?: unknown) => {
    const body = routes[url]
    if (body === undefined) return { ok: false, status: 404, json: async () => ({}) } as any
    return { ok: true, status: 200, json: async () => body } as any
  }
}

describe('RutubeAdapter', () => {
  it('matches только rutube-ссылки', () => {
    const a = new RutubeAdapter(fakeFetch({}))
    expect(a.matches('https://rutube.ru/video/x/')).toBe(true)
    expect(a.matches('https://ok.ru/video/x')).toBe(false)
  })

  it('resolve видео дергает api/video/{id}/', async () => {
    const a = new RutubeAdapter(fakeFetch({
      'https://rutube.ru/api/video/abc/': { id: 'abc', title: 'T', duration: 5, thumbnail_url: 't' },
    }))
    const res = await a.resolve('https://rutube.ru/video/abc/')
    expect(res).toEqual({
      kind: 'video',
      video: expect.objectContaining({ platformVideoId: 'abc', durationSec: 5 }),
    })
  })

  it('resolve канала дергает первую страницу person для метаданных', async () => {
    const a = new RutubeAdapter(fakeFetch({
      'https://rutube.ru/api/video/person/777/?page=1': {
        results: [{ id: 'v1', title: 'V', duration: 9, thumbnail_url: 't', author: { id: 777, name: 'Канал X', avatar_url: 'av' } }],
        has_next: false,
      },
    }))
    const res = await a.resolve('https://rutube.ru/channel/777/')
    expect(res).toMatchObject({
      kind: 'source',
      source: { kind: 'CHANNEL', platformSourceId: '777', title: 'Канал X' },
    })
  })

  it('resolve плейлиста берёт название из api/playlist/custom/{id}/', async () => {
    const a = new RutubeAdapter(fakeFetch({
      'https://rutube.ru/api/playlist/custom/1442688/?client=wdp': {
        id: 1442688, title: 'Щенячий патруль', thumbnail_url: 'pl.jpg',
      },
    }))
    const res = await a.resolve('https://rutube.ru/plst/1442688/')
    expect(res).toMatchObject({
      kind: 'source',
      source: { kind: 'PLAYLIST', platformSourceId: '1442688', title: 'Щенячий патруль', thumbnailUrl: 'pl.jpg' },
    })
  })

  it('listChannelVideos проходит пагинацию', async () => {
    const a = new RutubeAdapter(fakeFetch({
      'https://rutube.ru/api/video/person/777/?page=1': {
        results: [{ id: 'v1', title: 'A', duration: 1, thumbnail_url: 't' }], has_next: true,
      },
      'https://rutube.ru/api/video/person/777/?page=2': {
        results: [{ id: 'v2', title: 'B', duration: 2, thumbnail_url: 't' }], has_next: false,
      },
    }))
    const list = await a.listSourceVideos('CHANNEL', '777')
    expect(list.map((v) => v.platformVideoId)).toEqual(['v1', 'v2'])
  })

  it('listSourceVideos для плейлиста ходит в playlist-эндпоинт и склеивает страницы', async () => {
    const a = new RutubeAdapter(fakeFetch({
      'https://rutube.ru/api/playlist/custom/1442688/videos/?client=wdp&page=1': {
        results: [{ id: 'p1', title: 'Серия 1', duration: 1380, thumbnail_url: 't' }], has_next: true,
      },
      'https://rutube.ru/api/playlist/custom/1442688/videos/?client=wdp&page=2': {
        results: [{ id: 'p2', title: 'Серия 2', duration: 1300, thumbnail_url: 't' }], has_next: false,
      },
    }))
    const list = await a.listSourceVideos('PLAYLIST', '1442688')
    expect(list.map((v) => v.platformVideoId)).toEqual(['p1', 'p2'])
    expect(list[0].embedUrl).toBe('https://rutube.ru/play/embed/p1')
  })

  it('представляется браузерным User-Agent — иначе Rutube отдаёт 403', async () => {
    const seen: Array<{ url: string; init: any }> = []
    const a = new RutubeAdapter(async (url: string, init?: any) => {
      seen.push({ url, init })
      return { ok: true, status: 200, json: async () => ({ id: 'abc', title: 'T', duration: 1, thumbnail_url: 't' }) } as any
    })
    await a.resolve('https://rutube.ru/video/abc/')
    expect(String(seen[0].init?.headers?.['User-Agent'] ?? '')).toMatch(/Mozilla/)
  })

  it('resolve бросает для чужого URL', async () => {
    const a = new RutubeAdapter(fakeFetch({}))
    await expect(a.resolve('https://ok.ru/x')).rejects.toThrow()
  })
})
