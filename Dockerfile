# Двухстадийная сборка. Смысл: в рантайм-образ не должны попасть компилятор,
# dev-зависимости и исходники — они нужны только на сборке и весят больше, чем
# всё остальное вместе взятое.

# ---------- стадия 1: сборка ----------
FROM node:24-slim AS builder

# Нативный better-sqlite3 собирается из исходников, отсюда тулчейн.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# База на сборке не нужна — все страницы динамические; путь указываем времянкой.
ENV DATABASE_URL="file:/tmp/build.db"
RUN npx prisma generate && npm run build

# Выкидываем dev-зависимости: скомпилированный better-sqlite3, @prisma/client с
# движками и CLI prisma (он в dependencies, нужен для db push при старте) остаются.
RUN npm prune --omit=dev

# ---------- стадия 2: рантайм ----------
FROM node:24-slim AS runner

# openssl нужен движкам Prisma; компилятор здесь уже не нужен.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
# Боевая база лежит на постоянном томе.
ENV DATABASE_URL="file:/data/dev.db"

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/prisma.config.mjs ./prisma.config.mjs

EXPOSE 8080

# При первом запуске создаём схему и аккаунт родителя. Обе операции идемпотентны:
# db push ничего не делает на готовой базе, seed не трогает существующий пароль.
CMD ["sh", "-c", "npx prisma db push && node prisma/seed.mjs && npx next start -p 8080"]
