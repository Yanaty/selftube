import { db } from './db'

// v1: одна семья. Для SaaS здесь будет резолв по сессии/поддомену.
export const DEFAULT_ACCOUNT_ID = 'default-account'

export async function getCurrentAccountId(): Promise<string> {
  return DEFAULT_ACCOUNT_ID
}

export async function requireAccount() {
  const account = await db.account.findUnique({ where: { id: DEFAULT_ACCOUNT_ID } })
  if (!account) throw new Error('Account not seeded — run npm run db:seed')
  return account
}
