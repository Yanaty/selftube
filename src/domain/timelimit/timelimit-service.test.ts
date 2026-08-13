import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { addWatchedSeconds, getStatus } from './timelimit-service'

const ACC = 'test-timelimit-acc'

beforeEach(async () => {
  await db.dailyUsage.deleteMany({ where: { accountId: ACC } })
  await db.setting.deleteMany({ where: { accountId: ACC } })
  await db.account.upsert({ where: { id: ACC }, update: {}, create: { id: ACC } })
})

describe('TimeLimitService', () => {
  it('накопление секунд за сегодня', async () => {
    await db.setting.create({ data: { accountId: ACC, dailyLimitMinutes: 30 } })
    await addWatchedSeconds(ACC, 60)
    await addWatchedSeconds(ACC, 30)
    const status = await getStatus(ACC)
    expect(status.secondsWatched).toBe(90)
    expect(status.blocked).toBe(false)
    expect(status.remainingSeconds).toBe(30 * 60 - 90)
  })

  it('блокирует при превышении лимита', async () => {
    await db.setting.create({ data: { accountId: ACC, dailyLimitMinutes: 1 } })
    await addWatchedSeconds(ACC, 70)
    const status = await getStatus(ACC)
    expect(status.blocked).toBe(true)
    expect(status.remainingSeconds).toBe(0)
  })

  it('без настройки лимита — не блокирует', async () => {
    await addWatchedSeconds(ACC, 5000)
    const status = await getStatus(ACC)
    expect(status.blocked).toBe(false)
  })
})
