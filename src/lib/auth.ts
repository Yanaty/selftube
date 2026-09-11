import { randomBytes } from 'node:crypto'
import { db } from './db'
import bcrypt from 'bcryptjs'
import { SESSION_COOKIE } from './auth-constants'

const SESSION_TTL_DAYS = 30

/**
 * Токен сессии обязан быть криптослучайным. Раньше им был cuid из @default —
 * он монотонный и предсказуемый, для секретов не предназначен.
 */
export function newSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

export async function verifyParent(email: string, password: string) {
  const parent = await db.parent.findUnique({ where: { email } })
  if (!parent) return null
  const ok = await bcrypt.compare(password, parent.passwordHash)
  return ok ? parent : null
}

export async function createSession(parentId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 864e5)
  const session = await db.session.create({ data: { id: newSessionToken(), parentId, expiresAt } })
  return session.id
}

/**
 * Меняет пароль и выкидывает все прочие сессии: если пароль меняют из-за того,
 * что он утёк, чужой вход должен оборваться.
 */
export async function setParentPassword(parentId: string, password: string, keepSessionId?: string) {
  await db.parent.update({ where: { id: parentId }, data: { passwordHash: await bcrypt.hash(password, 10) } })
  await db.session.deleteMany({
    where: keepSessionId ? { parentId, NOT: { id: keepSessionId } } : { parentId },
  })
}

export async function getParentBySession(token: string) {
  if (!token) return null
  const session = await db.session.findUnique({ where: { id: token }, include: { parent: true } })
  if (!session) return null
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  return session.parent
}

export async function destroySession(token: string) {
  await db.session.deleteMany({ where: { id: token } })
}

export { SESSION_COOKIE }
