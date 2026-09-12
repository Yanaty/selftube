// Обычный JS, а не TypeScript: сид выполняется в рантайм-образе, и тащить туда
// tsx ради двадцати строк не хочется.
import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? 'file:./dev.db' })
const db = new PrismaClient({ adapter })

async function main() {
  // Различаем «переменной нет» и «переменная пустая». Нет — значит локальная
  // разработка, подставляем отладочные значения. Пустая — значит .env на сервере
  // не заполнен, и создавать родителя с пустым паролем нельзя: падаем громко,
  // иначе пустой аккаунт тихо уедет в боевую базу.
  const rawEmail = process.env.SEED_PARENT_EMAIL
  const rawPassword = process.env.SEED_PARENT_PASSWORD
  for (const [name, value] of [['SEED_PARENT_EMAIL', rawEmail], ['SEED_PARENT_PASSWORD', rawPassword]]) {
    if (value !== undefined && value.trim() === '') {
      console.error(`${name} задана, но пуста — проверьте .env рядом с docker-compose.yml`)
      process.exit(1)
    }
  }
  const email = rawEmail ?? 'parent@example.com'
  const password = rawPassword ?? 'changeme123'

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
