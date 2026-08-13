import { describe, it, expect } from 'vitest'
import { requireAccount, DEFAULT_ACCOUNT_ID } from './account'

describe('account', () => {
  it('возвращает засиженный account', async () => {
    const account = await requireAccount()
    expect(account.id).toBe(DEFAULT_ACCOUNT_ID)
  })
})
