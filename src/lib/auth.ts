import { db } from './db'
import bcrypt from 'bcryptjs'
import { SESSION_COOKIE } from './auth-constants'

const SESSION_TTL_DAYS = 30

export async function verifyParent(email: string, password: string) {
  const parent = await db.parent.findUnique({ where: { email } })
  if (!parent) return null
  const ok = await bcrypt.compare(password, parent.passwordHash)
  return ok ? parent : null
}

export async function createSession(parentId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 864e5)
  const session = await db.session.create({ data: { parentId, expiresAt } })
  return session.id
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
