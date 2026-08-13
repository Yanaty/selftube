import bcrypt from 'bcryptjs'
// Reuse the shared db client (Prisma 7 driver adapter). The `@/` alias may not
// resolve when run via tsx, so import it with a relative path.
import { db } from '../src/lib/db'

async function main() {
  const email = process.env.SEED_PARENT_EMAIL ?? 'parent@example.com'
  const password = process.env.SEED_PARENT_PASSWORD ?? 'changeme123'

  const account = await db.account.upsert({
    where: { id: 'default-account' },
    update: {},
    create: { id: 'default-account' },
  })
  await db.setting.upsert({
    where: { accountId: account.id },
    update: {},
    create: { accountId: account.id, dailyLimitMinutes: null },
  })
  const passwordHash = await bcrypt.hash(password, 10)
  await db.parent.upsert({
    where: { email },
    update: {},
    create: { accountId: account.id, email, passwordHash },
  })
  console.log(`Seeded account ${account.id}, parent ${email}`)
}

main().finally(() => db.$disconnect())
