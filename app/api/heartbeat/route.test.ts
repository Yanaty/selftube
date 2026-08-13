import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { getStatus } from '@/domain/timelimit/timelimit-service'
import { POST } from './route'
import { DEFAULT_ACCOUNT_ID } from '@/lib/account'

beforeEach(async () => {
  await db.dailyUsage.deleteMany({ where: { accountId: DEFAULT_ACCOUNT_ID } })
  await db.account.upsert({ where: { id: DEFAULT_ACCOUNT_ID }, update: {}, create: { id: DEFAULT_ACCOUNT_ID } })
})

describe('POST /api/heartbeat', () => {
  it('добавляет секунды и возвращает статус', async () => {
    const req = new Request('http://x/api/heartbeat', { method: 'POST', body: JSON.stringify({ seconds: 5 }) })
    const res = await POST(req)
    const json = await res.json()
    expect(json.blocked).toBe(false)
    const status = await getStatus(DEFAULT_ACCOUNT_ID)
    expect(status.secondsWatched).toBe(5)
  })

  it('ограничивает секунды сверху (защита от накрутки)', async () => {
    const req = new Request('http://x/api/heartbeat', { method: 'POST', body: JSON.stringify({ seconds: 99999 }) })
    await POST(req)
    const status = await getStatus(DEFAULT_ACCOUNT_ID)
    expect(status.secondsWatched).toBeLessThanOrEqual(30)
  })
})
