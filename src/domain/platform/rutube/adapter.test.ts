import { describe, it, expect } from 'vitest'
import { RutubeAdapter } from './adapter'

function fakeFetch(routes: Record<string, unknown>) {
  return async (url: string) => {
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
    expect(res).toMatchObject({ kind: 'channel', channel: { platformChannelId: '777', title: 'Канал X' } })
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
    const list = await a.listChannelVideos('777')
    expect(list.map((v) => v.platformVideoId)).toEqual(['v1', 'v2'])
  })

  it('resolve бросает для чужого URL', async () => {
    const a = new RutubeAdapter(fakeFetch({}))
    await expect(a.resolve('https://ok.ru/x')).rejects.toThrow()
  })
})
