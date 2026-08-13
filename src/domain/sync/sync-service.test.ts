import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { addChannelByUrl, hideVideo, listChildCatalog } from '@/domain/catalog/catalog-service'
import { syncChannel } from './sync-service'
import { RutubeAdapter } from '@/domain/platform/rutube/adapter'

const ACC = 'test-sync-acc'
let routes: Record<string, unknown> = {}
const adapter = new RutubeAdapter(async (url: string) => {
  const b = routes[url]
  return b === undefined
    ? ({ ok: false, status: 404, json: async () => ({}) } as any)
    : ({ ok: true, status: 200, json: async () => b } as any)
})

beforeEach(async () => {
  await db.video.deleteMany({ where: { accountId: ACC } })
  await db.channel.deleteMany({ where: { accountId: ACC } })
  await db.account.upsert({ where: { id: ACC }, update: {}, create: { id: ACC } })
  routes = {
    'https://rutube.ru/api/video/person/777/?page=1': {
      results: [{ id: 'a', title: 'A', duration: 1, thumbnail_url: 't', author: { id: 777, name: 'K' } }],
      has_next: false,
    },
  }
})

describe('syncChannel', () => {
  it('добавляет новые видео канала', async () => {
    const ch = await addChannelByUrl(ACC, 'https://rutube.ru/channel/777/', adapter)
    routes['https://rutube.ru/api/video/person/777/?page=1'] = {
      results: [
        { id: 'a', title: 'A', duration: 1, thumbnail_url: 't' },
        { id: 'c', title: 'C (новое)', duration: 3, thumbnail_url: 't' },
      ],
      has_next: false,
    }
    await syncChannel(ACC, ch.id, adapter)
    const catalog = await listChildCatalog(ACC)
    expect(catalog.map((v) => v.platformVideoId).sort()).toEqual(['a', 'c'])
  })

  it('не воскрешает скрытое видео', async () => {
    const ch = await addChannelByUrl(ACC, 'https://rutube.ru/channel/777/', adapter)
    const vids = await db.video.findMany({ where: { accountId: ACC } })
    await hideVideo(ACC, vids[0].id)
    await syncChannel(ACC, ch.id, adapter)
    const catalog = await listChildCatalog(ACC)
    expect(catalog).toHaveLength(0) // 'a' остаётся скрытым
  })
})
