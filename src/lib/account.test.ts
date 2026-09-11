import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import { requireAccount, DEFAULT_ACCOUNT_ID } from './account'

// Аккаунт создаём сами: иначе тест проходит только там, где базу перед ним засеяли,
// и падает на чистой базе в CI.
beforeEach(async () => {
  await db.account.upsert({ where: { id: DEFAULT_ACCOUNT_ID }, update: {}, create: { id: DEFAULT_ACCOUNT_ID } })
})

describe('account', () => {
  it('возвращает засиженный account', async () => {
    const account = await requireAccount()
    expect(account.id).toBe(DEFAULT_ACCOUNT_ID)
  })
})
