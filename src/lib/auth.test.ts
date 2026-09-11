import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import { verifyParent, createSession, getParentBySession, destroySession, newSessionToken, setParentPassword } from './auth'
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

describe('токен сессии', () => {
  it('криптослучайный, а не предсказуемый идентификатор', () => {
    const a = newSessionToken()
    const b = newSessionToken()
    expect(a).not.toBe(b)
    // 32 байта в base64url — 43 символа; cuid был бы короче и предсказуем.
    expect(a.length).toBeGreaterThanOrEqual(43)
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('в базе лежит именно выданный токен', async () => {
    const p = await verifyParent(EMAIL, 'secret123')
    const token = await createSession(p!.id)
    expect(await db.session.findUnique({ where: { id: token } })).not.toBeNull()
  })
})

describe('setParentPassword', () => {
  it('меняет пароль: старый перестаёт подходить', async () => {
    const p = await verifyParent(EMAIL, 'secret123')
    await setParentPassword(p!.id, 'новый-длинный-пароль')
    expect(await verifyParent(EMAIL, 'secret123')).toBeNull()
    expect((await verifyParent(EMAIL, 'новый-длинный-пароль'))?.email).toBe(EMAIL)
  })

  it('выкидывает остальные сессии, а текущую оставляет', async () => {
    const p = await verifyParent(EMAIL, 'secret123')
    const mine = await createSession(p!.id)
    const other = await createSession(p!.id)

    await setParentPassword(p!.id, 'новый-длинный-пароль', mine)

    expect(await getParentBySession(mine)).not.toBeNull()
    expect(await getParentBySession(other)).toBeNull()
  })
})
