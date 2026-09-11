# Образ для Fly.io. Специально без multi-stage и standalone: better-sqlite3 —
# нативный модуль, а prisma и tsx нужны в рантайме (миграция схемы и сид при
# первом запуске). Размер образа для семейного приложения роли не играет.
FROM node:20-slim

# Сборка нативного better-sqlite3 требует тулчейна, openssl нужен prisma.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# На сборке база не нужна — все страницы динамические; путь указываем времянкой,
# чтобы адаптер не ругался на отсутствие переменной.
ENV DATABASE_URL="file:/tmp/build.db"
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
ENV PORT=8080
# Боевая база лежит на постоянном диске Fly, примонтированном в /data.
ENV DATABASE_URL="file:/data/dev.db"
EXPOSE 8080

# При первом запуске создаём схему и аккаунт родителя. Обе операции идемпотентны:
# db push ничего не делает на готовой базе, seed использует upsert и не трогает
# существующий пароль.
CMD ["sh", "-c", "npx prisma db push && npx tsx prisma/seed.ts && npx next start -p 8080"]
