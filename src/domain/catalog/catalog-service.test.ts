import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import {
  addVideoByUrl, addChannelByUrl, listChildCatalog, hideVideo, deleteChannel,
} from './catalog-service'
import { RutubeAdapter } from '@/domain/platform/rutube/adapter'

const ACC = 'test-catalog-acc'

function fakeAdapter(routes: Record<string, unknown>) {
  const fetchFn = async (url: string) => {
    const b = routes[url]
    return b === undefined
      ? ({ ok: false, status: 404, json: async () => ({}) } as any)
      : ({ ok: true, status: 200, json: async () => b } as any)
  }
  return new RutubeAdapter(fetchFn)
}

beforeEach(async () => {
  await db.video.deleteMany({ where: { accountId: ACC } })
  await db.channel.deleteMany({ where: { accountId: ACC } })
  await db.account.upsert({ where: { id: ACC }, update: {}, create: { id: ACC } })
})

describe('CatalogService', () => {
  it('добавляет ручное видео по ссылке', async () => {
    const adapter = fakeAdapter({
      'https://rutube.ru/api/video/v1/': { id: 'v1', title: 'Трактор', duration: 100, thumbnail_url: 't' },
    })
    const video = await addVideoByUrl(ACC, 'https://rutube.ru/video/v1/', adapter)
    expect(video.sourceType).toBe('MANUAL')
    const catalog = await listChildCatalog(ACC)
    expect(catalog.map((v) => v.platformVideoId)).toContain('v1')
  })

  it('добавляет канал и его видео', async () => {
    const adapter = fakeAdapter({
      'https://rutube.ru/api/video/person/777/?page=1': {
        results: [
          { id: 'a', title: 'A', duration: 1, thumbnail_url: 't', author: { id: 777, name: 'Канал X' } },
          { id: 'b', title: 'B', duration: 2, thumbnail_url: 't' },
        ],
        has_next: false,
      },
    })
    const channel = await addChannelByUrl(ACC, 'https://rutube.ru/channel/777/', adapter)
    expect(channel.title).toBe('Канал X')
    const catalog = await listChildCatalog(ACC)
    expect(catalog.map((v) => v.platformVideoId).sort()).toEqual(['a', 'b'])
  })

  it('скрытое видео не попадает в детский каталог', async () => {
    const adapter = fakeAdapter({
      'https://rutube.ru/api/video/v1/': { id: 'v1', title: 'X', duration: 1, thumbnail_url: 't' },
    })
    const v = await addVideoByUrl(ACC, 'https://rutube.ru/video/v1/', adapter)
    await hideVideo(ACC, v.id)
    const catalog = await listChildCatalog(ACC)
    expect(catalog).toHaveLength(0)
  })

  it('удаление канала убирает его видео из каталога', async () => {
    const adapter = fakeAdapter({
      'https://rutube.ru/api/video/person/777/?page=1': {
        results: [{ id: 'a', title: 'A', duration: 1, thumbnail_url: 't', author: { id: 777, name: 'K' } }],
        has_next: false,
      },
    })
    const ch = await addChannelByUrl(ACC, 'https://rutube.ru/channel/777/', adapter)
    await deleteChannel(ACC, ch.id)
    expect(await listChildCatalog(ACC)).toHaveLength(0)
  })
})
