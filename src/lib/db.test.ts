import { describe, it, expect } from 'vitest'
import { db } from './db'

describe('db', () => {
  it('подключается и считает аккаунты', async () => {
    const count = await db.account.count()
    expect(typeof count).toBe('number')
  })
})
