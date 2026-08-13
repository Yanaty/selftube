import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import { verifyParent, createSession, getParentBySession, destroySession } from './auth'
import bcrypt from 'bcryptjs'

const ACC = 'test-auth-acc'
const EMAIL = 'auth-test@example.com'

beforeEach(async () => {
  await db.session.deleteMany({ where: { parent: { email: EMAIL } } })
  await db.parent.deleteMany({ where: { email: EMAIL } })
  await db.account.upsert({ where: { id: ACC }, update: {}, create: { id: ACC } })
  await db.parent.create({ data: { accountId: ACC, email: EMAIL, passwordHash: await bcrypt.hash('secret123', 10) } })
})

describe('auth', () => {
  it('verifyParent принимает верный пароль', async () => {
    const p = await verifyParent(EMAIL, 'secret123')
    expect(p?.email).toBe(EMAIL)
  })
  it('verifyParent отвергает неверный пароль', async () => {
    expect(await verifyParent(EMAIL, 'wrong')).toBeNull()
  })
  it('сессия создаётся и резолвится, потом уничтожается', async () => {
    const p = await verifyParent(EMAIL, 'secret123')
    const token = await createSession(p!.id)
    expect((await getParentBySession(token))?.email).toBe(EMAIL)
    await destroySession(token)
    expect(await getParentBySession(token)).toBeNull()
  })
  it('getParentBySession возвращает null для мусора', async () => {
    expect(await getParentBySession('nope')).toBeNull()
  })
})
