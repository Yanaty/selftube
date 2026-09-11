// Обычный JS, а не TypeScript: этот конфиг читает и prisma CLI внутри
// рантайм-образа, где dev-зависимостей (включая typescript) нет.
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Локально приезжает из .env, в контейнере — из переменных окружения.
    url: process.env.DATABASE_URL ?? 'file:./dev.db',
  },
})
