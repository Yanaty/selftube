// Обычный JS, а не TypeScript: сид выполняется в рантайм-образе, и тащить туда
// tsx ради двадцати строк не хочется.
import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? 'file:./dev.db' })
const db = new PrismaClient({ adapter })

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
  // update пустой намеренно: повторный запуск не должен сбрасывать пароль,
  // который родитель уже сменил.
  await db.parent.upsert({
    where: { email },
    update: {},
    create: { accountId: account.id, email, passwordHash: await bcrypt.hash(password, 10) },
  })
  console.log(`Seeded account ${account.id}, parent ${email}`)
}

main().finally(() => db.$disconnect())
