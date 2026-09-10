import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import {
  addVideoByUrl, addSourceByUrl, listChildCatalog, hideVideo, deleteChannel,
  listChildCatalogPage, setVideoHidden, deleteManualVideo, listAdminManualVideos,
  getAdminSource, listAdminSourceVideos,
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
    const channel = await addSourceByUrl(ACC, 'https://rutube.ru/channel/777/', adapter)
    expect(channel.title).toBe('Канал X')
    expect(channel.kind).toBe('CHANNEL')
    const catalog = await listChildCatalog(ACC)
    expect(catalog.map((v) => v.platformVideoId).sort()).toEqual(['a', 'b'])
  })

  it('добавляет плейлист целиком как отдельный источник', async () => {
    const adapter = fakeAdapter({
      'https://rutube.ru/api/playlist/custom/1442688/?client=wdp': {
        id: 1442688, title: 'Щенячий патруль', thumbnail_url: 'pl.jpg',
      },
      'https://rutube.ru/api/playlist/custom/1442688/videos/?client=wdp&page=1': {
        results: [
          { id: 'p1', title: 'Серия 1', duration: 1380, thumbnail_url: 't' },
          { id: 'p2', title: 'Серия 2', duration: 1300, thumbnail_url: 't' },
        ],
        has_next: false,
      },
    })
    const playlist = await addSourceByUrl(ACC, 'https://rutube.ru/plst/1442688/', adapter)
    expect(playlist).toMatchObject({ kind: 'PLAYLIST', title: 'Щенячий патруль' })

    const catalog = await listChildCatalog(ACC)
    expect(catalog.map((v) => v.platformVideoId).sort()).toEqual(['p1', 'p2'])
    // Видео привязаны к источнику: выключение плейлиста убирает их у ребёнка.
    expect(catalog.every((v) => v.channelId === playlist.id)).toBe(true)
  })

  it('канал и плейлист с одинаковым числовым id не конфликтуют', async () => {
    const adapter = fakeAdapter({
      'https://rutube.ru/api/video/person/555/?page=1': {
        results: [{ id: 'ch1', title: 'C', duration: 1, thumbnail_url: 't', author: { id: 555, name: 'Канал 555' } }],
        has_next: false,
      },
      'https://rutube.ru/api/playlist/custom/555/?client=wdp': { id: 555, title: 'Плейлист 555', thumbnail_url: 'p' },
      'https://rutube.ru/api/playlist/custom/555/videos/?client=wdp&page=1': {
        results: [{ id: 'pl1', title: 'P', duration: 2, thumbnail_url: 't' }], has_next: false,
      },
    })
    const channel = await addSourceByUrl(ACC, 'https://rutube.ru/channel/555/', adapter)
    const playlist = await addSourceByUrl(ACC, 'https://rutube.ru/plst/555/', adapter)
    expect(playlist.id).not.toBe(channel.id)
    expect(await listChildCatalog(ACC)).toHaveLength(2)
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
    const ch = await addSourceByUrl(ACC, 'https://rutube.ru/channel/777/', adapter)
    await deleteChannel(ACC, ch.id)
    expect(await listChildCatalog(ACC)).toHaveLength(0)
  })
})

describe('listChildCatalogPage', () => {
  async function seedVideos(n: number) {
    for (let i = 0; i < n; i++) {
      await db.video.create({
        data: {
          accountId: ACC, platform: 'RUTUBE', platformVideoId: 'v' + i,
          title: 'Видео ' + i, thumbnailUrl: 't', durationSec: 10,
          embedUrl: 'e', sourceType: 'MANUAL',
        },
      })
    }
  }

  it('отдаёт страницу и общее число видео', async () => {
    await seedVideos(25)
    const page = await listChildCatalogPage(ACC, { seed: 1, offset: 0, limit: 10 })
    expect(page.items).toHaveLength(10)
    expect(page.total).toBe(25)
  })

  it('страницы одного зерна не дублируют и не теряют видео', async () => {
    await seedVideos(25)
    const first = await listChildCatalogPage(ACC, { seed: 777, offset: 0, limit: 10 })
    const second = await listChildCatalogPage(ACC, { seed: 777, offset: 10, limit: 10 })
    const third = await listChildCatalogPage(ACC, { seed: 777, offset: 20, limit: 10 })
    const ids = [...first.items, ...second.items, ...third.items].map((v) => v.id)
    expect(ids).toHaveLength(25)
    expect(new Set(ids).size).toBe(25)
  })

  it('разные зёрна дают разный порядок', async () => {
    await seedVideos(25)
    const a = await listChildCatalogPage(ACC, { seed: 1, offset: 0, limit: 25 })
    const b = await listChildCatalogPage(ACC, { seed: 2, offset: 0, limit: 25 })
    expect(a.items.map((v) => v.id)).not.toEqual(b.items.map((v) => v.id))
  })

  it('с запросом отдаёт только подходящие и не перемешивает их', async () => {
    await seedVideos(25)
    const page = await listChildCatalogPage(ACC, { seed: 1, offset: 0, limit: 50, query: 'Видео 1' })
    // «Видео 1», «Видео 10»…«Видео 19» — 11 штук
    expect(page.total).toBe(11)
    expect(page.items).toHaveLength(11)
    const again = await listChildCatalogPage(ACC, { seed: 99, offset: 0, limit: 50, query: 'Видео 1' })
    expect(again.items.map((v) => v.id)).toEqual(page.items.map((v) => v.id))
  })

  it('скрытое видео не попадает на страницу', async () => {
    await seedVideos(3)
    const all = await listChildCatalog(ACC)
    await hideVideo(ACC, all[0].id)
    const page = await listChildCatalogPage(ACC, { seed: 1, offset: 0, limit: 10 })
    expect(page.total).toBe(2)
    expect(page.items.map((v) => v.id)).not.toContain(all[0].id)
  })
})

describe('setVideoHidden — скрыть и вернуть обратно', () => {
  async function manualVideo() {
    const adapter = fakeAdapter({
      'https://rutube.ru/api/video/v9/': { id: 'v9', title: 'Монстр-трак', duration: 10, thumbnail_url: 't' },
    })
    return addVideoByUrl(ACC, 'https://rutube.ru/video/v9/', adapter)
  }

  it('скрытое возвращается в детский каталог, когда родитель передумал', async () => {
    const v = await manualVideo()
    await setVideoHidden(ACC, v.id, true)
    expect(await listChildCatalog(ACC)).toHaveLength(0)

    await setVideoHidden(ACC, v.id, false)
    expect((await listChildCatalog(ACC)).map((x) => x.id)).toEqual([v.id])
  })

  it('скрытое видео остаётся в админском списке — родителю нужно видеть, что он спрятал', async () => {
    const v = await manualVideo()
    await setVideoHidden(ACC, v.id, true)
    const admin = await listAdminManualVideos(ACC)
    expect(admin.map((x) => x.id)).toContain(v.id)
    expect(admin.find((x) => x.id === v.id)!.hidden).toBe(true)
  })
})

describe('deleteManualVideo', () => {
  it('удаляет видео, добавленное вручную', async () => {
    const adapter = fakeAdapter({
      'https://rutube.ru/api/video/v9/': { id: 'v9', title: 'X', duration: 10, thumbnail_url: 't' },
    })
    const v = await addVideoByUrl(ACC, 'https://rutube.ru/video/v9/', adapter)
    await deleteManualVideo(ACC, v.id)
    expect(await listAdminManualVideos(ACC)).toHaveLength(0)
  })

  it('не трогает видео из источника — синхронизация всё равно вернула бы его', async () => {
    const adapter = fakeAdapter({
      'https://rutube.ru/api/video/person/777/?page=1': {
        results: [{ id: 'a', title: 'A', duration: 1, thumbnail_url: 't', author: { id: 777, name: 'K' } }],
        has_next: false,
      },
    })
    await addSourceByUrl(ACC, 'https://rutube.ru/channel/777/', adapter)
    const [fromChannel] = await listChildCatalog(ACC)

    await expect(deleteManualVideo(ACC, fromChannel.id)).rejects.toThrow()
    expect(await listChildCatalog(ACC)).toHaveLength(1)
  })
})

describe('страница источника в админке', () => {
  const channelAdapter = () => fakeAdapter({
    'https://rutube.ru/api/video/person/777/?page=1': {
      results: [
        { id: 'a', title: 'Щенячий патруль 1 серия', duration: 1, thumbnail_url: 't', author: { id: 777, name: 'Канал X' } },
        { id: 'b', title: 'Щенячий патруль 2 серия', duration: 2, thumbnail_url: 't' },
        { id: 'c', title: 'Синий трактор', duration: 3, thumbnail_url: 't' },
      ],
      has_next: false,
    },
  })

  it('отдаёт источник по id и только его видео', async () => {
    const source = await addSourceByUrl(ACC, 'https://rutube.ru/channel/777/', channelAdapter())
    const adapter2 = fakeAdapter({
      'https://rutube.ru/api/video/v9/': { id: 'v9', title: 'Ручное', duration: 1, thumbnail_url: 't' },
    })
    await addVideoByUrl(ACC, 'https://rutube.ru/video/v9/', adapter2)

    expect((await getAdminSource(ACC, source.id))!.title).toBe('Канал X')
    const page = await listAdminSourceVideos(ACC, source.id, { offset: 0, limit: 50 })
    expect(page.total).toBe(3)
    expect(page.items.map((v) => v.platformVideoId).sort()).toEqual(['a', 'b', 'c'])
  })

  it('показывает скрытые видео и считает их', async () => {
    const source = await addSourceByUrl(ACC, 'https://rutube.ru/channel/777/', channelAdapter())
    const before = await listAdminSourceVideos(ACC, source.id, { offset: 0, limit: 50 })
    await setVideoHidden(ACC, before.items[0].id, true)

    const after = await listAdminSourceVideos(ACC, source.id, { offset: 0, limit: 50 })
    expect(after.hidden).toBe(1)
    expect(after.items).toHaveLength(3) // скрытое остаётся в списке — его надо видеть, чтобы вернуть
    expect(after.items.find((v) => v.id === before.items[0].id)!.hidden).toBe(true)
  })

  it('ищет по названию без учёта регистра', async () => {
    const source = await addSourceByUrl(ACC, 'https://rutube.ru/channel/777/', channelAdapter())
    const page = await listAdminSourceVideos(ACC, source.id, { offset: 0, limit: 50, query: 'ЩЕНЯЧИЙ' })
    expect(page.total).toBe(2)
    expect(page.items.map((v) => v.platformVideoId).sort()).toEqual(['a', 'b'])
  })

  it('режет на страницы', async () => {
    const source = await addSourceByUrl(ACC, 'https://rutube.ru/channel/777/', channelAdapter())
    const first = await listAdminSourceVideos(ACC, source.id, { offset: 0, limit: 2 })
    const second = await listAdminSourceVideos(ACC, source.id, { offset: 2, limit: 2 })
    expect(first.items).toHaveLength(2)
    expect(second.items).toHaveLength(1)
    expect(first.total).toBe(3)
  })

  it('не отдаёт источник чужого аккаунта', async () => {
    const source = await addSourceByUrl(ACC, 'https://rutube.ru/channel/777/', channelAdapter())
    expect(await getAdminSource('other-account', source.id)).toBeNull()
    const page = await listAdminSourceVideos('other-account', source.id, { offset: 0, limit: 50 })
    expect(page.total).toBe(0)
  })
})
