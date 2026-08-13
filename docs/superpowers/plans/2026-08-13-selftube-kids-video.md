# SelfTube — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Родительский фильтр видео для детей: ребёнок смотрит только одобренные родителем видео/каналы Rutube в интерфейсе «как YouTube», без доступа к рекомендациям.

**Architecture:** Один Next.js (App Router) проект с чистым доменным слоем (TypeScript, без зависимостей от Next). Платформо-специфичный код изолирован за интерфейсом `PlatformAdapter` (v1 — только Rutube). Детская часть читает только одобренный каталог из БД. Изоляция плеера — sandbox-iframe + собственная оболочка + fail-closed. Всё привязано к `Account` для будущего SaaS.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Prisma + SQLite, TailwindCSS, Vitest, bcryptjs, zod.

**Spec:** `docs/superpowers/specs/2026-08-13-selftube-kids-video-design.md`

---

## File Structure

```
prisma/schema.prisma                         — модель данных
prisma/seed.ts                               — сид: один Account + Parent
src/lib/db.ts                                — синглтон Prisma
src/lib/env.ts                               — чтение переменных окружения
src/lib/account.ts                           — текущий account (v1: единственный)
src/lib/auth.ts                              — хеш пароля, сессия, cookie
src/domain/platform/types.ts                 — PlatformVideo/Channel/Adapter (интерфейс)
src/domain/platform/rutube/parse.ts          — чистый парсинг URL и ответов Rutube
src/domain/platform/rutube/adapter.ts        — RutubeAdapter (HTTP через инъекцию fetch)
src/domain/platform/registry.ts              — выбор адаптера по URL
src/domain/catalog/visibility.ts             — чистое правило видимости для ребёнка
src/domain/catalog/catalog-service.ts        — операции каталога (Prisma)
src/domain/sync/sync-service.ts              — синхронизация каналов
src/domain/timelimit/timelimit.ts            — чистый расчёт остатка/блокировки
src/domain/timelimit/timelimit-service.ts    — учёт времени (Prisma)
src/components/SafePlayer/handshake.ts       — стейт-машина рукопожатия (fail-closed)
src/components/SafePlayer/SafePlayer.tsx     — React-компонент безопасного плеера
app/(kids)/page.tsx                          — детская главная (сетка)
app/(kids)/search/page.tsx                   — поиск по каталогу
app/(kids)/watch/[videoId]/page.tsx          — экран просмотра
app/admin/login/page.tsx                     — вход родителя
app/admin/page.tsx                           — каталог (каналы + видео)
app/admin/settings/page.tsx                  — настройки (лимит времени)
app/api/heartbeat/route.ts                   — пульс времени просмотра
app/api/admin/*/route.ts                     — server actions/routes админки
middleware.ts                                — защита /admin
```

Тесты — рядом с исходником как `*.test.ts`. Доменный слой покрыт юнит-тестами; операции с БД — интеграционными тестами против отдельного SQLite-файла.

---

## Phase 0 — Scaffold и инструменты

### Task 1: Инициализация Next.js + инструментов

**Files:**
- Modify: `package.json`
- Create: `tsconfig.json` (перезапись), `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `app/globals.css`, `app/layout.tsx`, `vitest.config.ts`, `.env`, `.env.example`

- [ ] **Step 1: Установить зависимости**

Run:
```bash
npm install next@14 react@18 react-dom@18 @prisma/client bcryptjs zod
npm install -D typescript @types/react @types/node @types/bcryptjs tailwindcss postcss autoprefixer prisma vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 2: Настроить скрипты в `package.json`**

Заменить блок `"scripts"` на:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest run",
  "test:watch": "vitest",
  "db:push": "prisma db push",
  "db:seed": "tsx prisma/seed.ts"
}
```
Добавить в зависимости `tsx`:
```bash
npm install -D tsx
```

- [ ] **Step 3: Создать `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
}
export default nextConfig
```

- [ ] **Step 4: Создать `tsconfig.json` (перезаписать существующий)**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "incremental": true,
    "paths": { "@/*": ["./src/*"] },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Настроить Tailwind**

`tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
export default config
```
`postcss.config.mjs`:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
```
`app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 6: Корневой layout**

`app/layout.tsx`:
```tsx
import './globals.css'
import type { ReactNode } from 'react'

export const metadata = { title: 'SelfTube', description: 'Видео для детей' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 7: Vitest config**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
```

- [ ] **Step 8: Файлы окружения**

`.env`:
```
DATABASE_URL="file:./dev.db"
SESSION_SECRET="change-me-in-prod-please-32-chars-min"
```
`.env.example` — то же, но с пустыми значениями. Убедиться, что `.env` и `*.db` в `.gitignore`.

- [ ] **Step 9: Проверить, что проект запускается**

Run: `npm run dev`
Expected: Next.js стартует на http://localhost:3000 без ошибок (пустая страница — это ок). Остановить (Ctrl+C).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Prisma + Tailwind + Vitest"
```

---

### Task 2: Модель данных (Prisma)

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/db.ts`
- Test: `src/lib/db.test.ts`

- [ ] **Step 1: Написать схему**

`prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Account {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  parents   Parent[]
  channels  Channel[]
  videos    Video[]
  setting   Setting?
  usage     DailyUsage[]
}

model Parent {
  id           String    @id @default(cuid())
  accountId    String
  email        String    @unique
  passwordHash String
  createdAt    DateTime  @default(now())
  account      Account   @relation(fields: [accountId], references: [id])
  sessions     Session[]
}

model Session {
  id        String   @id @default(cuid())
  parentId  String
  expiresAt DateTime
  parent    Parent   @relation(fields: [parentId], references: [id], onDelete: Cascade)
}

model Channel {
  id                String   @id @default(cuid())
  accountId         String
  platform          String   // "RUTUBE"
  platformChannelId String
  title             String
  thumbnailUrl      String
  enabled           Boolean  @default(true)
  lastSyncedAt      DateTime?
  addedAt           DateTime @default(now())
  account           Account  @relation(fields: [accountId], references: [id])
  videos            Video[]
  @@unique([accountId, platform, platformChannelId])
}

model Video {
  id              String   @id @default(cuid())
  accountId       String
  platform        String   // "RUTUBE"
  platformVideoId String
  title           String
  thumbnailUrl    String
  durationSec     Int
  embedUrl        String
  sourceType      String   // "MANUAL" | "CHANNEL"
  channelId       String?
  hidden          Boolean  @default(false)
  publishedAt     DateTime?
  addedAt         DateTime @default(now())
  account         Account  @relation(fields: [accountId], references: [id])
  channel         Channel? @relation(fields: [channelId], references: [id])
  @@unique([accountId, platform, platformVideoId])
}

model Setting {
  accountId         String  @id
  dailyLimitMinutes Int?
  account           Account @relation(fields: [accountId], references: [id])
}

model DailyUsage {
  accountId      String
  date           String   // "YYYY-MM-DD"
  secondsWatched Int      @default(0)
  account        Account  @relation(fields: [accountId], references: [id])
  @@id([accountId, date])
}
```

- [ ] **Step 2: Синглтон Prisma**

`src/lib/db.ts`:
```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
export const db = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

- [ ] **Step 3: Сгенерировать клиент и создать БД**

Run:
```bash
npx prisma generate
npm run db:push
```
Expected: `dev.db` создан, клиент сгенерирован без ошибок.

- [ ] **Step 4: Тест — БД доступна и модели существуют**

`src/lib/db.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { db } from './db'

describe('db', () => {
  it('подключается и считает аккаунты', async () => {
    const count = await db.account.count()
    expect(typeof count).toBe('number')
  })
})
```

- [ ] **Step 5: Запустить тест**

Run: `npm test src/lib/db.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: prisma data model (Account/Parent/Channel/Video/Setting/DailyUsage/Session)"
```

---

### Task 3: Сид и разрешение текущего account

**Files:**
- Create: `prisma/seed.ts`, `src/lib/account.ts`
- Test: `src/lib/account.test.ts`

- [ ] **Step 1: Скрипт сида**

`prisma/seed.ts`:
```ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

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
```

- [ ] **Step 2: Запустить сид**

Run: `npm run db:seed`
Expected: печатает `Seeded account default-account, parent parent@example.com`.

- [ ] **Step 3: Хелпер текущего account (v1 — единственный)**

`src/lib/account.ts`:
```ts
import { db } from './db'

// v1: одна семья. Для SaaS здесь будет резолв по сессии/поддомену.
export const DEFAULT_ACCOUNT_ID = 'default-account'

export async function getCurrentAccountId(): Promise<string> {
  return DEFAULT_ACCOUNT_ID
}

export async function requireAccount() {
  const account = await db.account.findUnique({ where: { id: DEFAULT_ACCOUNT_ID } })
  if (!account) throw new Error('Account not seeded — run npm run db:seed')
  return account
}
```

- [ ] **Step 4: Тест**

`src/lib/account.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { requireAccount, DEFAULT_ACCOUNT_ID } from './account'

describe('account', () => {
  it('возвращает засиженный account', async () => {
    const account = await requireAccount()
    expect(account.id).toBe(DEFAULT_ACCOUNT_ID)
  })
})
```

- [ ] **Step 5: Запустить тест**

Run: `npm test src/lib/account.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: seed default account/parent + current-account resolver"
```

---

## Phase 1 — Безопасный плеер (снятие главного риска — делается первым по спеку)

### Task 4: Стейт-машина рукопожатия (fail-closed), чистая логика

**Files:**
- Create: `src/components/SafePlayer/handshake.ts`
- Test: `src/components/SafePlayer/handshake.test.ts`

- [ ] **Step 1: Тест — состояния рукопожатия**

`src/components/SafePlayer/handshake.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { createHandshake } from './handshake'

describe('handshake (fail-closed)', () => {
  it('стартует в состоянии connecting', () => {
    const h = createHandshake(2000)
    expect(h.state()).toBe('connecting')
  })

  it('переходит в ready при подтверждении плеера', () => {
    const h = createHandshake(2000)
    h.onPlayerReady()
    expect(h.state()).toBe('ready')
  })

  it('переходит в failed по таймауту без подтверждения', () => {
    const h = createHandshake(2000)
    h.onTimeout()
    expect(h.state()).toBe('failed')
  })

  it('после ready таймаут уже не роняет в failed', () => {
    const h = createHandshake(2000)
    h.onPlayerReady()
    h.onTimeout()
    expect(h.state()).toBe('ready')
  })

  it('timeoutMs доступен для планирования таймера', () => {
    const h = createHandshake(1500)
    expect(h.timeoutMs).toBe(1500)
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test src/components/SafePlayer/handshake.test.ts`
Expected: FAIL — `createHandshake is not defined`.

- [ ] **Step 3: Реализация**

`src/components/SafePlayer/handshake.ts`:
```ts
export type HandshakeState = 'connecting' | 'ready' | 'failed'

export function createHandshake(timeoutMs: number) {
  let state: HandshakeState = 'connecting'
  return {
    timeoutMs,
    state: () => state,
    onPlayerReady() {
      if (state === 'connecting') state = 'ready'
    },
    onTimeout() {
      if (state === 'connecting') state = 'failed'
    },
  }
}
```

- [ ] **Step 4: Запустить тест**

Run: `npm test src/components/SafePlayer/handshake.test.ts`
Expected: PASS (5 тестов).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: safe-player handshake state machine (fail-closed)"
```

---

### Task 5: Компонент SafePlayer + спайк на живом Rutube

**Files:**
- Create: `src/components/SafePlayer/SafePlayer.tsx`
- Create: `app/spike/page.tsx` (временная страница для ручной проверки)

- [ ] **Step 1: Реализовать компонент**

`src/components/SafePlayer/SafePlayer.tsx`:
```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { createHandshake } from './handshake'

type Props = {
  embedUrl: string        // https://rutube.ru/play/embed/{id}
  onEnded: () => void      // показать наш экран «видео закончилось»
  onTick?: (seconds: number) => void // пульс времени
}

// Rutube postMessage API: команды {type:'player:play'|...}, события {type:'player:...'}
export function SafePlayer({ embedUrl, onEnded, onTick }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [handshake] = useState(() => createHandshake(4000))
  const [, force] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      handshake.onTimeout()
      force((n) => n + 1)
    }, handshake.timeoutMs)

    function onMessage(e: MessageEvent) {
      if (!/rutube\.ru$/.test(new URL(e.origin).hostname)) return
      const data = typeof e.data === 'string' ? safeParse(e.data) : e.data
      if (!data || typeof data.type !== 'string') return
      if (data.type === 'player:ready' || data.type === 'player:changeState') {
        handshake.onPlayerReady()
        force((n) => n + 1)
      }
      if (data.type === 'player:playComplete') onEnded()
      if (data.type === 'player:changeState' && data.data?.state === 'playing') setPlaying(true)
      if (data.type === 'player:changeState' && data.data?.state === 'paused') setPlaying(false)
    }
    window.addEventListener('message', onMessage)
    return () => { clearTimeout(timer); window.removeEventListener('message', onMessage) }
  }, [handshake, onEnded])

  useEffect(() => {
    if (!onTick) return
    const id = setInterval(() => { if (playing) onTick(5) }, 5000)
    return () => clearInterval(id)
  }, [playing, onTick])

  function send(method: string) {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ type: `player:${method}`, data: {} }), '*',
    )
  }

  if (handshake.state() === 'failed') {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center rounded-2xl bg-amber-100 text-amber-900 font-bold">
        Видео временно недоступно
      </div>
    )
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: '16 / 9' }}>
      <iframe
        ref={iframeRef}
        src={`${embedUrl}${embedUrl.includes('?') ? '&' : '?'}`}
        className="absolute inset-0 h-full w-full"
        sandbox="allow-scripts allow-same-origin"
        allow="fullscreen; encrypted-media"
        referrerPolicy="strict-origin-when-cross-origin"
      />
      {/* Прозрачный слой: перехватывает касания по родному UI плеера */}
      <div className="absolute inset-0" onClick={() => (playing ? send('pause') : send('play'))} />
      {/* Наши контролы */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-4 bg-gradient-to-t from-black/70 to-transparent p-3 text-2xl text-white">
        <button onClick={() => send('setCurrentTime')} aria-label="Назад 10с">⏪</button>
        <button onClick={() => (playing ? send('pause') : send('play'))} aria-label="Пауза/играть">
          {playing ? '⏸' : '▶️'}
        </button>
        <button onClick={() => send('mute')} className="ml-auto" aria-label="Звук">🔊</button>
      </div>
    </div>
  )
}

function safeParse(s: string): any { try { return JSON.parse(s) } catch { return null } }
```

- [ ] **Step 2: Временная страница-спайк**

`app/spike/page.tsx`:
```tsx
'use client'
import { SafePlayer } from '@/components/SafePlayer/SafePlayer'

export default function Spike() {
  // Подставить реальный ID видео Rutube для ручной проверки.
  const id = 'REPLACE_WITH_REAL_RUTUBE_VIDEO_ID'
  return (
    <div className="mx-auto max-w-2xl p-4">
      <SafePlayer embedUrl={`https://rutube.ru/play/embed/${id}`} onEnded={() => alert('ended')} />
    </div>
  )
}
```

- [ ] **Step 3: РУЧНАЯ ПРОВЕРКА (спайк) — критично для проекта**

1. Найти реальный публичный ID видео Rutube, вставить в `app/spike/page.tsx`.
2. `npm run dev`, открыть http://localhost:3000/spike.
3. Проверить и записать результат по каждому пункту:
   - [ ] Видео проигрывается, наша кнопка play/pause работает (postMessage доходит).
   - [ ] Клик по области плеера НЕ открывает ссылки Rutube / не уводит со страницы.
   - [ ] По окончании видео вызывается `onEnded` (alert) — событие `playComplete` приходит.
   - [ ] Если событий нет вовсе — компонент показывает «видео временно недоступно» (fail-closed).
4. **Если названия событий/команд Rutube отличаются от предположенных** (`player:ready`, `player:changeState`, `player:playComplete`, `player:play/pause/mute/setCurrentTime`) — скорректировать строки в `SafePlayer.tsx` под реальные (см. Rutube Player JS API), пока цена мала.

- [ ] **Step 4: Зафиксировать вывод спайка**

Добавить короткую заметку в конец `docs/superpowers/specs/2026-08-13-selftube-kids-video-design.md` под заголовком «## Результат спайка плеера»: что подтвердилось, какие имена событий/команд реальные, какие ограничения найдены.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: SafePlayer component + spike verification against live Rutube"
```

---

## Phase 2 — Доменный слой: платформа Rutube

### Task 6: Типы платформы

**Files:**
- Create: `src/domain/platform/types.ts`

- [ ] **Step 1: Определить типы и интерфейс**

`src/domain/platform/types.ts`:
```ts
export type Platform = 'RUTUBE'

export type PlatformVideo = {
  platform: Platform
  platformVideoId: string
  title: string
  thumbnailUrl: string
  durationSec: number
  embedUrl: string
  publishedAt: Date | null
}

export type PlatformChannel = {
  platform: Platform
  platformChannelId: string
  title: string
  thumbnailUrl: string
}

export type ResolvedLink =
  | { kind: 'video'; video: PlatformVideo }
  | { kind: 'channel'; channel: PlatformChannel }

export interface PlatformAdapter {
  readonly platform: Platform
  matches(url: string): boolean
  resolve(url: string): Promise<ResolvedLink>
  listChannelVideos(platformChannelId: string): Promise<PlatformVideo[]>
  getEmbedUrl(platformVideoId: string): string
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: platform adapter types"
```

---

### Task 7: Rutube — чистый парсинг URL и ответов

**Files:**
- Create: `src/domain/platform/rutube/parse.ts`
- Test: `src/domain/platform/rutube/parse.test.ts`

- [ ] **Step 1: Тест парсинга URL и маппинга ответов**

`src/domain/platform/rutube/parse.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  parseRutubeUrl, embedUrl, mapVideoResponse, mapChannelListItem,
} from './parse'

describe('parseRutubeUrl', () => {
  it('распознаёт видео', () => {
    expect(parseRutubeUrl('https://rutube.ru/video/abc123def/'))
      .toEqual({ kind: 'video', id: 'abc123def' })
  })
  it('распознаёт embed-видео', () => {
    expect(parseRutubeUrl('https://rutube.ru/play/embed/abc123def'))
      .toEqual({ kind: 'video', id: 'abc123def' })
  })
  it('распознаёт канал', () => {
    expect(parseRutubeUrl('https://rutube.ru/channel/23704195/'))
      .toEqual({ kind: 'channel', id: '23704195' })
  })
  it('возвращает null для чужого/битого URL', () => {
    expect(parseRutubeUrl('https://youtube.com/watch?v=x')).toBeNull()
    expect(parseRutubeUrl('not a url')).toBeNull()
  })
})

describe('embedUrl', () => {
  it('строит embed-URL', () => {
    expect(embedUrl('abc')).toBe('https://rutube.ru/play/embed/abc')
  })
})

describe('mapVideoResponse', () => {
  it('маппит ответ api/video/{id}/ во внутреннюю модель', () => {
    const raw = {
      id: 'abc', title: 'Синий трактор', duration: 493,
      thumbnail_url: 'https://pic.rtbcdn.ru/x.jpg',
      publication_ts: '2024-01-02T00:00:00', author: { id: 111 },
    }
    expect(mapVideoResponse(raw)).toEqual({
      platform: 'RUTUBE', platformVideoId: 'abc', title: 'Синий трактор',
      thumbnailUrl: 'https://pic.rtbcdn.ru/x.jpg', durationSec: 493,
      embedUrl: 'https://rutube.ru/play/embed/abc',
      publishedAt: new Date('2024-01-02T00:00:00'),
    })
  })
  it('терпит отсутствие даты', () => {
    const raw = { id: 'abc', title: 'X', duration: 10, thumbnail_url: 't' }
    expect(mapVideoResponse(raw).publishedAt).toBeNull()
  })
})

describe('mapChannelListItem', () => {
  it('маппит элемент списка видео канала', () => {
    const raw = { id: 'v1', title: 'V', duration: 60, thumbnail_url: 't' }
    expect(mapChannelListItem(raw)).toMatchObject({
      platformVideoId: 'v1', durationSec: 60,
      embedUrl: 'https://rutube.ru/play/embed/v1',
    })
  })
})
```

- [ ] **Step 2: Запустить — убедиться в падении**

Run: `npm test src/domain/platform/rutube/parse.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализация**

`src/domain/platform/rutube/parse.ts`:
```ts
import type { PlatformVideo } from '../types'

export type ParsedRutube = { kind: 'video' | 'channel'; id: string } | null

export function parseRutubeUrl(input: string): ParsedRutube {
  let url: URL
  try { url = new URL(input) } catch { return null }
  if (!/(^|\.)rutube\.ru$/.test(url.hostname)) return null
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts[0] === 'video' && parts[1]) return { kind: 'video', id: parts[1] }
  if (parts[0] === 'play' && parts[1] === 'embed' && parts[2]) return { kind: 'video', id: parts[2] }
  if (parts[0] === 'channel' && parts[1]) return { kind: 'channel', id: parts[1] }
  return null
}

export function embedUrl(videoId: string): string {
  return `https://rutube.ru/play/embed/${videoId}`
}

function toDate(v: unknown): Date | null {
  if (typeof v !== 'string' || v.length === 0) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

export function mapVideoResponse(raw: any): PlatformVideo {
  return {
    platform: 'RUTUBE',
    platformVideoId: String(raw.id),
    title: String(raw.title ?? ''),
    thumbnailUrl: String(raw.thumbnail_url ?? ''),
    durationSec: Number(raw.duration ?? 0),
    embedUrl: embedUrl(String(raw.id)),
    publishedAt: toDate(raw.publication_ts),
  }
}

export function mapChannelListItem(raw: any): PlatformVideo {
  return mapVideoResponse(raw)
}
```

- [ ] **Step 4: Запустить тест**

Run: `npm test src/domain/platform/rutube/parse.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: rutube url parsing and response mapping (pure)"
```

---

### Task 8: RutubeAdapter (HTTP через инъекцию fetch)

**Files:**
- Create: `src/domain/platform/rutube/adapter.ts`
- Test: `src/domain/platform/rutube/adapter.test.ts`

- [ ] **Step 1: Тест с фейковым fetch (без сети)**

`src/domain/platform/rutube/adapter.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { RutubeAdapter } from './adapter'

function fakeFetch(routes: Record<string, unknown>) {
  return async (url: string) => {
    const body = routes[url]
    if (body === undefined) return { ok: false, status: 404, json: async () => ({}) } as any
    return { ok: true, status: 200, json: async () => body } as any
  }
}

describe('RutubeAdapter', () => {
  it('matches только rutube-ссылки', () => {
    const a = new RutubeAdapter(fakeFetch({}))
    expect(a.matches('https://rutube.ru/video/x/')).toBe(true)
    expect(a.matches('https://ok.ru/video/x')).toBe(false)
  })

  it('resolve видео дергает api/video/{id}/', async () => {
    const a = new RutubeAdapter(fakeFetch({
      'https://rutube.ru/api/video/abc/': { id: 'abc', title: 'T', duration: 5, thumbnail_url: 't' },
    }))
    const res = await a.resolve('https://rutube.ru/video/abc/')
    expect(res).toEqual({
      kind: 'video',
      video: expect.objectContaining({ platformVideoId: 'abc', durationSec: 5 }),
    })
  })

  it('resolve канала дергает первую страницу person для метаданных', async () => {
    const a = new RutubeAdapter(fakeFetch({
      'https://rutube.ru/api/video/person/777/?page=1': {
        results: [{ id: 'v1', title: 'V', duration: 9, thumbnail_url: 't', author: { id: 777, name: 'Канал X', avatar_url: 'av' } }],
        has_next: false,
      },
    }))
    const res = await a.resolve('https://rutube.ru/channel/777/')
    expect(res).toMatchObject({ kind: 'channel', channel: { platformChannelId: '777', title: 'Канал X' } })
  })

  it('listChannelVideos проходит пагинацию', async () => {
    const a = new RutubeAdapter(fakeFetch({
      'https://rutube.ru/api/video/person/777/?page=1': {
        results: [{ id: 'v1', title: 'A', duration: 1, thumbnail_url: 't' }], has_next: true,
      },
      'https://rutube.ru/api/video/person/777/?page=2': {
        results: [{ id: 'v2', title: 'B', duration: 2, thumbnail_url: 't' }], has_next: false,
      },
    }))
    const list = await a.listChannelVideos('777')
    expect(list.map((v) => v.platformVideoId)).toEqual(['v1', 'v2'])
  })

  it('resolve бросает для чужого URL', async () => {
    const a = new RutubeAdapter(fakeFetch({}))
    await expect(a.resolve('https://ok.ru/x')).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Запустить — убедиться в падении**

Run: `npm test src/domain/platform/rutube/adapter.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализация**

`src/domain/platform/rutube/adapter.ts`:
```ts
import type { PlatformAdapter, PlatformVideo, ResolvedLink } from '../types'
import { parseRutubeUrl, embedUrl, mapVideoResponse, mapChannelListItem } from './parse'

type FetchLike = (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>

const MAX_PAGES = 50 // предохранитель от бесконечной пагинации

export class RutubeAdapter implements PlatformAdapter {
  readonly platform = 'RUTUBE' as const
  constructor(private readonly fetchFn: FetchLike = fetch as any) {}

  matches(url: string): boolean {
    return parseRutubeUrl(url) !== null
  }

  getEmbedUrl(platformVideoId: string): string {
    return embedUrl(platformVideoId)
  }

  async resolve(url: string): Promise<ResolvedLink> {
    const parsed = parseRutubeUrl(url)
    if (!parsed) throw new Error('Ссылка не распознана как видео или канал Rutube')
    if (parsed.kind === 'video') {
      const raw = await this.getJson(`https://rutube.ru/api/video/${parsed.id}/`)
      return { kind: 'video', video: mapVideoResponse(raw) }
    }
    const firstPage = await this.getJson(`https://rutube.ru/api/video/person/${parsed.id}/?page=1`)
    const author = firstPage.results?.[0]?.author
    return {
      kind: 'channel',
      channel: {
        platform: 'RUTUBE',
        platformChannelId: parsed.id,
        title: String(author?.name ?? `Канал ${parsed.id}`),
        thumbnailUrl: String(author?.avatar_url ?? ''),
      },
    }
  }

  async listChannelVideos(platformChannelId: string): Promise<PlatformVideo[]> {
    const out: PlatformVideo[] = []
    for (let page = 1; page <= MAX_PAGES; page++) {
      const data = await this.getJson(`https://rutube.ru/api/video/person/${platformChannelId}/?page=${page}`)
      for (const item of data.results ?? []) out.push(mapChannelListItem(item))
      if (!data.has_next) break
    }
    return out
  }

  private async getJson(url: string): Promise<any> {
    const res = await this.fetchFn(url)
    if (!res.ok) throw new Error(`Rutube API ${res.status}: ${url}`)
    return res.json()
  }
}
```

- [ ] **Step 4: Запустить тест**

Run: `npm test src/domain/platform/rutube/adapter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: RutubeAdapter (resolve video/channel, paginated listing)"
```

---

### Task 9: Реестр адаптеров

**Files:**
- Create: `src/domain/platform/registry.ts`
- Test: `src/domain/platform/registry.test.ts`

- [ ] **Step 1: Тест**

`src/domain/platform/registry.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { adapterForUrl } from './registry'

describe('adapterForUrl', () => {
  it('возвращает Rutube-адаптер для rutube-ссылки', () => {
    expect(adapterForUrl('https://rutube.ru/video/x/')?.platform).toBe('RUTUBE')
  })
  it('возвращает null для неподдерживаемой ссылки', () => {
    expect(adapterForUrl('https://ok.ru/video/x')).toBeNull()
  })
})
```

- [ ] **Step 2: Запустить — убедиться в падении**

Run: `npm test src/domain/platform/registry.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реализация**

`src/domain/platform/registry.ts`:
```ts
import type { PlatformAdapter } from './types'
import { RutubeAdapter } from './rutube/adapter'

// v1: только Rutube. Добавление платформы = добавить адаптер в массив.
const adapters: PlatformAdapter[] = [new RutubeAdapter()]

export function adapterForUrl(url: string): PlatformAdapter | null {
  return adapters.find((a) => a.matches(url)) ?? null
}

export function adapterForPlatform(platform: string): PlatformAdapter | null {
  return adapters.find((a) => a.platform === platform) ?? null
}
```

- [ ] **Step 4: Запустить тест**

Run: `npm test src/domain/platform/registry.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: platform adapter registry"
```

---

## Phase 3 — Доменный слой: каталог, синхронизация, лимит времени

### Task 10: Правило видимости (чистое)

**Files:**
- Create: `src/domain/catalog/visibility.ts`
- Test: `src/domain/catalog/visibility.test.ts`

- [ ] **Step 1: Тест**

`src/domain/catalog/visibility.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { isVisibleToChild } from './visibility'

const base = { hidden: false, sourceType: 'MANUAL' as const, channelEnabled: true }

describe('isVisibleToChild', () => {
  it('ручное видимо', () => {
    expect(isVisibleToChild(base)).toBe(true)
  })
  it('скрытое невидимо', () => {
    expect(isVisibleToChild({ ...base, hidden: true })).toBe(false)
  })
  it('видео из выключенного канала невидимо', () => {
    expect(isVisibleToChild({ hidden: false, sourceType: 'CHANNEL', channelEnabled: false })).toBe(false)
  })
  it('видео из включённого канала видимо', () => {
    expect(isVisibleToChild({ hidden: false, sourceType: 'CHANNEL', channelEnabled: true })).toBe(true)
  })
})
```

- [ ] **Step 2: Запустить — падение**

Run: `npm test src/domain/catalog/visibility.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реализация**

`src/domain/catalog/visibility.ts`:
```ts
export type VisibilityInput = {
  hidden: boolean
  sourceType: 'MANUAL' | 'CHANNEL'
  channelEnabled: boolean
}

export function isVisibleToChild(v: VisibilityInput): boolean {
  if (v.hidden) return false
  if (v.sourceType === 'CHANNEL' && !v.channelEnabled) return false
  return true
}
```

- [ ] **Step 4: Запустить тест**

Run: `npm test src/domain/catalog/visibility.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: child visibility rule (pure)"
```

---

### Task 11: CatalogService (операции с БД)

**Files:**
- Create: `src/domain/catalog/catalog-service.ts`
- Test: `src/domain/catalog/catalog-service.test.ts`

**Примечание по тестам с БД:** интеграционные тесты идут против того же SQLite (`dev.db`), очищая свои данные в `beforeEach`. Каждый тест использует свой account, чтобы не мешать сиду.

- [ ] **Step 1: Тест**

`src/domain/catalog/catalog-service.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import {
  addVideoByUrl, addChannelByUrl, listChildCatalog, hideVideo, deleteChannel,
} from './catalog-service'
import { RutubeAdapter } from '@/domain/platform/rutube/adapter'

const ACC = 'test-catalog-acc'

function fakeAdapter(routes: Record<string, unknown>) {
  const fetchFn = async (url: string) => {
    const b = routes[url]
    return b === undefined
      ? ({ ok: false, status: 404, json: async () => ({}) } as any)
      : ({ ok: true, status: 200, json: async () => b } as any)
  }
  return new RutubeAdapter(fetchFn)
}

beforeEach(async () => {
  await db.video.deleteMany({ where: { accountId: ACC } })
  await db.channel.deleteMany({ where: { accountId: ACC } })
  await db.account.upsert({ where: { id: ACC }, update: {}, create: { id: ACC } })
})

describe('CatalogService', () => {
  it('добавляет ручное видео по ссылке', async () => {
    const adapter = fakeAdapter({
      'https://rutube.ru/api/video/v1/': { id: 'v1', title: 'Трактор', duration: 100, thumbnail_url: 't' },
    })
    const video = await addVideoByUrl(ACC, 'https://rutube.ru/video/v1/', adapter)
    expect(video.sourceType).toBe('MANUAL')
    const catalog = await listChildCatalog(ACC)
    expect(catalog.map((v) => v.platformVideoId)).toContain('v1')
  })

  it('добавляет канал и его видео', async () => {
    const adapter = fakeAdapter({
      'https://rutube.ru/api/video/person/777/?page=1': {
        results: [
          { id: 'a', title: 'A', duration: 1, thumbnail_url: 't', author: { id: 777, name: 'Канал X' } },
          { id: 'b', title: 'B', duration: 2, thumbnail_url: 't' },
        ],
        has_next: false,
      },
    })
    const channel = await addChannelByUrl(ACC, 'https://rutube.ru/channel/777/', adapter)
    expect(channel.title).toBe('Канал X')
    const catalog = await listChildCatalog(ACC)
    expect(catalog.map((v) => v.platformVideoId).sort()).toEqual(['a', 'b'])
  })

  it('скрытое видео не попадает в детский каталог', async () => {
    const adapter = fakeAdapter({
      'https://rutube.ru/api/video/v1/': { id: 'v1', title: 'X', duration: 1, thumbnail_url: 't' },
    })
    const v = await addVideoByUrl(ACC, 'https://rutube.ru/video/v1/', adapter)
    await hideVideo(ACC, v.id)
    const catalog = await listChildCatalog(ACC)
    expect(catalog).toHaveLength(0)
  })

  it('удаление канала убирает его видео из каталога', async () => {
    const adapter = fakeAdapter({
      'https://rutube.ru/api/video/person/777/?page=1': {
        results: [{ id: 'a', title: 'A', duration: 1, thumbnail_url: 't', author: { id: 777, name: 'K' } }],
        has_next: false,
      },
    })
    const ch = await addChannelByUrl(ACC, 'https://rutube.ru/channel/777/', adapter)
    await deleteChannel(ACC, ch.id)
    expect(await listChildCatalog(ACC)).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Запустить — падение**

Run: `npm test src/domain/catalog/catalog-service.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализация**

`src/domain/catalog/catalog-service.ts`:
```ts
import { db } from '@/lib/db'
import type { PlatformAdapter, PlatformVideo } from '@/domain/platform/types'
import { isVisibleToChild } from './visibility'

async function upsertVideo(
  accountId: string, v: PlatformVideo,
  sourceType: 'MANUAL' | 'CHANNEL', channelId: string | null,
) {
  return db.video.upsert({
    where: { accountId_platform_platformVideoId: { accountId, platform: v.platform, platformVideoId: v.platformVideoId } },
    update: { title: v.title, thumbnailUrl: v.thumbnailUrl, durationSec: v.durationSec, embedUrl: v.embedUrl, publishedAt: v.publishedAt },
    create: {
      accountId, platform: v.platform, platformVideoId: v.platformVideoId,
      title: v.title, thumbnailUrl: v.thumbnailUrl, durationSec: v.durationSec,
      embedUrl: v.embedUrl, sourceType, channelId, publishedAt: v.publishedAt,
    },
  })
}

export async function addVideoByUrl(accountId: string, url: string, adapter: PlatformAdapter) {
  const res = await adapter.resolve(url)
  if (res.kind !== 'video') throw new Error('Ссылка ведёт на канал, а не на видео')
  return upsertVideo(accountId, res.video, 'MANUAL', null)
}

export async function addChannelByUrl(accountId: string, url: string, adapter: PlatformAdapter) {
  const res = await adapter.resolve(url)
  if (res.kind !== 'channel') throw new Error('Ссылка ведёт на видео, а не на канал')
  const channel = await db.channel.upsert({
    where: { accountId_platform_platformChannelId: { accountId, platform: res.channel.platform, platformChannelId: res.channel.platformChannelId } },
    update: { title: res.channel.title, thumbnailUrl: res.channel.thumbnailUrl },
    create: { accountId, platform: res.channel.platform, platformChannelId: res.channel.platformChannelId, title: res.channel.title, thumbnailUrl: res.channel.thumbnailUrl },
  })
  const videos = await adapter.listChannelVideos(res.channel.platformChannelId)
  for (const v of videos) await upsertVideo(accountId, v, 'CHANNEL', channel.id)
  await db.channel.update({ where: { id: channel.id }, data: { lastSyncedAt: new Date() } })
  return channel
}

export async function listChildCatalog(accountId: string) {
  const videos = await db.video.findMany({
    where: { accountId },
    include: { channel: true },
    orderBy: { addedAt: 'desc' },
  })
  return videos.filter((v) =>
    isVisibleToChild({
      hidden: v.hidden,
      sourceType: v.sourceType as 'MANUAL' | 'CHANNEL',
      channelEnabled: v.channel?.enabled ?? true,
    }),
  )
}

export async function searchChildCatalog(accountId: string, query: string) {
  const all = await listChildCatalog(accountId)
  const q = query.trim().toLowerCase()
  if (!q) return all
  return all.filter((v) => v.title.toLowerCase().includes(q))
}

export async function hideVideo(accountId: string, videoId: string) {
  await db.video.updateMany({ where: { id: videoId, accountId }, data: { hidden: true } })
}

export async function listAdminChannels(accountId: string) {
  return db.channel.findMany({
    where: { accountId },
    orderBy: { addedAt: 'desc' },
    include: { _count: { select: { videos: true } } },
  })
}

export async function listAdminManualVideos(accountId: string) {
  return db.video.findMany({ where: { accountId, sourceType: 'MANUAL' }, orderBy: { addedAt: 'desc' } })
}

export async function deleteChannel(accountId: string, channelId: string) {
  await db.video.deleteMany({ where: { accountId, channelId } })
  await db.channel.deleteMany({ where: { id: channelId, accountId } })
}
```

- [ ] **Step 4: Запустить тест**

Run: `npm test src/domain/catalog/catalog-service.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: CatalogService (add/list/hide/delete, child catalog + search)"
```

---

### Task 12: SyncService

**Files:**
- Create: `src/domain/sync/sync-service.ts`
- Test: `src/domain/sync/sync-service.test.ts`

- [ ] **Step 1: Тест — синхронизация уважает hidden и не воскрешает**

`src/domain/sync/sync-service.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { addChannelByUrl, hideVideo, listChildCatalog } from '@/domain/catalog/catalog-service'
import { syncChannel } from './sync-service'
import { RutubeAdapter } from '@/domain/platform/rutube/adapter'

const ACC = 'test-sync-acc'
let routes: Record<string, unknown> = {}
const adapter = new RutubeAdapter(async (url: string) => {
  const b = routes[url]
  return b === undefined
    ? ({ ok: false, status: 404, json: async () => ({}) } as any)
    : ({ ok: true, status: 200, json: async () => b } as any)
})

beforeEach(async () => {
  await db.video.deleteMany({ where: { accountId: ACC } })
  await db.channel.deleteMany({ where: { accountId: ACC } })
  await db.account.upsert({ where: { id: ACC }, update: {}, create: { id: ACC } })
  routes = {
    'https://rutube.ru/api/video/person/777/?page=1': {
      results: [{ id: 'a', title: 'A', duration: 1, thumbnail_url: 't', author: { id: 777, name: 'K' } }],
      has_next: false,
    },
  }
})

describe('syncChannel', () => {
  it('добавляет новые видео канала', async () => {
    const ch = await addChannelByUrl(ACC, 'https://rutube.ru/channel/777/', adapter)
    routes['https://rutube.ru/api/video/person/777/?page=1'] = {
      results: [
        { id: 'a', title: 'A', duration: 1, thumbnail_url: 't' },
        { id: 'c', title: 'C (новое)', duration: 3, thumbnail_url: 't' },
      ],
      has_next: false,
    }
    await syncChannel(ACC, ch.id, adapter)
    const catalog = await listChildCatalog(ACC)
    expect(catalog.map((v) => v.platformVideoId).sort()).toEqual(['a', 'c'])
  })

  it('не воскрешает скрытое видео', async () => {
    const ch = await addChannelByUrl(ACC, 'https://rutube.ru/channel/777/', adapter)
    const vids = await db.video.findMany({ where: { accountId: ACC } })
    await hideVideo(ACC, vids[0].id)
    await syncChannel(ACC, ch.id, adapter)
    const catalog = await listChildCatalog(ACC)
    expect(catalog).toHaveLength(0) // 'a' остаётся скрытым
  })
})
```

- [ ] **Step 2: Запустить — падение**

Run: `npm test src/domain/sync/sync-service.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реализация**

`src/domain/sync/sync-service.ts`:
```ts
import { db } from '@/lib/db'
import type { PlatformAdapter } from '@/domain/platform/types'

// Синхронизирует один канал: добавляет новые видео, обновляет метаданные,
// НЕ трогает поле hidden у существующих (уважает решение родителя).
export async function syncChannel(accountId: string, channelId: string, adapter: PlatformAdapter) {
  const channel = await db.channel.findFirst({ where: { id: channelId, accountId } })
  if (!channel) throw new Error('Канал не найден')

  const videos = await adapter.listChannelVideos(channel.platformChannelId)
  for (const v of videos) {
    await db.video.upsert({
      where: { accountId_platform_platformVideoId: { accountId, platform: v.platform, platformVideoId: v.platformVideoId } },
      // update НЕ содержит hidden — скрытое остаётся скрытым
      update: { title: v.title, thumbnailUrl: v.thumbnailUrl, durationSec: v.durationSec, embedUrl: v.embedUrl, publishedAt: v.publishedAt },
      create: {
        accountId, platform: v.platform, platformVideoId: v.platformVideoId,
        title: v.title, thumbnailUrl: v.thumbnailUrl, durationSec: v.durationSec,
        embedUrl: v.embedUrl, sourceType: 'CHANNEL', channelId: channel.id, publishedAt: v.publishedAt,
      },
    })
  }
  await db.channel.update({ where: { id: channel.id }, data: { lastSyncedAt: new Date() } })
  return { synced: videos.length }
}

export async function syncAllChannels(accountId: string, adapter: PlatformAdapter) {
  const channels = await db.channel.findMany({ where: { accountId, enabled: true } })
  let total = 0
  for (const c of channels) {
    const r = await syncChannel(accountId, c.id, adapter)
    total += r.synced
  }
  return { channels: channels.length, videos: total }
}
```

- [ ] **Step 4: Запустить тест**

Run: `npm test src/domain/sync/sync-service.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: SyncService (per-channel + all, respects hidden)"
```

---

### Task 13: Лимит времени — чистый расчёт

**Files:**
- Create: `src/domain/timelimit/timelimit.ts`
- Test: `src/domain/timelimit/timelimit.test.ts`

- [ ] **Step 1: Тест**

`src/domain/timelimit/timelimit.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { remainingSeconds, isBlocked, todayKey } from './timelimit'

describe('timelimit', () => {
  it('без лимита — не блокирует, остаток бесконечный', () => {
    expect(isBlocked(null, 99999)).toBe(false)
    expect(remainingSeconds(null, 99999)).toBe(Infinity)
  })
  it('считает остаток', () => {
    expect(remainingSeconds(30, 120)).toBe(120 * 60 - 120) // 30 мин лимит, 120 сек просмотрено
  })
  it('блокирует при достижении лимита', () => {
    expect(isBlocked(10, 10 * 60)).toBe(true)
    expect(isBlocked(10, 10 * 60 - 1)).toBe(false)
  })
  it('остаток не бывает отрицательным', () => {
    expect(remainingSeconds(10, 10 * 60 + 500)).toBe(0)
  })
  it('todayKey форматирует YYYY-MM-DD', () => {
    expect(todayKey(new Date('2026-08-13T10:00:00Z'))).toBe('2026-08-13')
  })
})
```

- [ ] **Step 2: Запустить — падение**

Run: `npm test src/domain/timelimit/timelimit.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реализация**

`src/domain/timelimit/timelimit.ts`:
```ts
export function todayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function remainingSeconds(limitMinutes: number | null, secondsWatched: number): number {
  if (limitMinutes === null) return Infinity
  return Math.max(0, limitMinutes * 60 - secondsWatched)
}

export function isBlocked(limitMinutes: number | null, secondsWatched: number): boolean {
  return remainingSeconds(limitMinutes, secondsWatched) <= 0
}
```

- [ ] **Step 4: Запустить тест**

Run: `npm test src/domain/timelimit/timelimit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: time-limit pure calculations"
```

---

### Task 14: TimeLimitService (учёт в БД)

**Files:**
- Create: `src/domain/timelimit/timelimit-service.ts`
- Test: `src/domain/timelimit/timelimit-service.test.ts`

- [ ] **Step 1: Тест**

`src/domain/timelimit/timelimit-service.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { addWatchedSeconds, getStatus } from './timelimit-service'

const ACC = 'test-timelimit-acc'

beforeEach(async () => {
  await db.dailyUsage.deleteMany({ where: { accountId: ACC } })
  await db.setting.deleteMany({ where: { accountId: ACC } })
  await db.account.upsert({ where: { id: ACC }, update: {}, create: { id: ACC } })
})

describe('TimeLimitService', () => {
  it('накопление секунд за сегодня', async () => {
    await db.setting.create({ data: { accountId: ACC, dailyLimitMinutes: 30 } })
    await addWatchedSeconds(ACC, 60)
    await addWatchedSeconds(ACC, 30)
    const status = await getStatus(ACC)
    expect(status.secondsWatched).toBe(90)
    expect(status.blocked).toBe(false)
    expect(status.remainingSeconds).toBe(30 * 60 - 90)
  })

  it('блокирует при превышении лимита', async () => {
    await db.setting.create({ data: { accountId: ACC, dailyLimitMinutes: 1 } })
    await addWatchedSeconds(ACC, 70)
    const status = await getStatus(ACC)
    expect(status.blocked).toBe(true)
    expect(status.remainingSeconds).toBe(0)
  })

  it('без настройки лимита — не блокирует', async () => {
    await addWatchedSeconds(ACC, 5000)
    const status = await getStatus(ACC)
    expect(status.blocked).toBe(false)
  })
})
```

- [ ] **Step 2: Запустить — падение**

Run: `npm test src/domain/timelimit/timelimit-service.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реализация**

`src/domain/timelimit/timelimit-service.ts`:
```ts
import { db } from '@/lib/db'
import { todayKey, remainingSeconds, isBlocked } from './timelimit'

export async function addWatchedSeconds(accountId: string, seconds: number) {
  const date = todayKey()
  await db.dailyUsage.upsert({
    where: { accountId_date: { accountId, date } },
    update: { secondsWatched: { increment: seconds } },
    create: { accountId, date, secondsWatched: seconds },
  })
}

export async function getStatus(accountId: string) {
  const date = todayKey()
  const [usage, setting] = await Promise.all([
    db.dailyUsage.findUnique({ where: { accountId_date: { accountId, date } } }),
    db.setting.findUnique({ where: { accountId } }),
  ])
  const secondsWatched = usage?.secondsWatched ?? 0
  const limit = setting?.dailyLimitMinutes ?? null
  return {
    secondsWatched,
    dailyLimitMinutes: limit,
    remainingSeconds: remainingSeconds(limit, secondsWatched),
    blocked: isBlocked(limit, secondsWatched),
  }
}

export async function setDailyLimit(accountId: string, minutes: number | null) {
  await db.setting.upsert({
    where: { accountId },
    update: { dailyLimitMinutes: minutes },
    create: { accountId, dailyLimitMinutes: minutes },
  })
}
```

- [ ] **Step 4: Запустить тест**

Run: `npm test src/domain/timelimit/timelimit-service.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: TimeLimitService (accrual, status, set limit)"
```

---

## Phase 4 — Авторизация родителя

### Task 15: Хелперы auth (пароль + сессия)

**Files:**
- Create: `src/lib/auth.ts`
- Test: `src/lib/auth.test.ts`

- [ ] **Step 1: Тест**

`src/lib/auth.test.ts`:
```ts
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
```

- [ ] **Step 2: Запустить — падение**

Run: `npm test src/lib/auth.test.ts`
Expected: FAIL.

- [ ] **Step 3: Реализация**

`src/lib/auth.ts`:
```ts
import { db } from './db'
import bcrypt from 'bcryptjs'

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

export const SESSION_COOKIE = 'selftube_session'
```

- [ ] **Step 4: Запустить тест**

Run: `npm test src/lib/auth.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: auth helpers (verify parent, session lifecycle)"
```

---

### Task 16: Логин, middleware, выход

**Files:**
- Create: `app/admin/login/page.tsx`, `app/admin/login/actions.ts`, `app/admin/logout/route.ts`, `middleware.ts`

- [ ] **Step 1: Server action логина**

`app/admin/login/actions.ts`:
```ts
'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { verifyParent, createSession, SESSION_COOKIE } from '@/lib/auth'

const schema = z.object({ email: z.string().email(), password: z.string().min(1) })

export async function login(_prev: unknown, formData: FormData) {
  const parsed = schema.safeParse({ email: formData.get('email'), password: formData.get('password') })
  if (!parsed.success) return { error: 'Введите корректный email и пароль' }
  const parent = await verifyParent(parsed.data.email, parsed.data.password)
  if (!parent) return { error: 'Неверный email или пароль' }
  const token = await createSession(parent.id)
  cookies().set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' })
  redirect('/admin')
}
```

- [ ] **Step 2: Страница логина**

`app/admin/login/page.tsx`:
```tsx
'use client'
import { useFormState } from 'react-dom'
import { login } from './actions'

export default function LoginPage() {
  const [state, action] = useFormState(login, { error: '' as string })
  return (
    <div className="mx-auto mt-24 max-w-sm rounded-2xl border p-6">
      <h1 className="mb-4 text-xl font-bold">Вход для родителя</h1>
      <form action={action} className="space-y-3">
        <input name="email" type="email" placeholder="Email" className="w-full rounded-lg border p-2" />
        <input name="password" type="password" placeholder="Пароль" className="w-full rounded-lg border p-2" />
        {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        <button className="w-full rounded-lg bg-orange-500 p-2 font-bold text-white">Войти</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Выход**

`app/admin/logout/route.ts`:
```ts
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { destroySession, SESSION_COOKIE } from '@/lib/auth'

export async function POST(req: Request) {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (token) await destroySession(token)
  cookies().delete(SESSION_COOKIE)
  return NextResponse.redirect(new URL('/admin/login', req.url))
}
```

- [ ] **Step 4: Middleware защиты /admin**

`middleware.ts`:
```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth'

// Проверка только наличия cookie (лёгкая). Полная валидация сессии — в layout админки.
export function middleware(req: NextRequest) {
  const isLogin = req.nextUrl.pathname.startsWith('/admin/login')
  const hasCookie = req.cookies.has(SESSION_COOKIE)
  if (!isLogin && !hasCookie) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }
  return NextResponse.next()
}

export const config = { matcher: ['/admin/:path*'] }
```

- [ ] **Step 5: Ручная проверка**

Run: `npm run dev`, открыть http://localhost:3000/admin → редирект на `/admin/login`. Войти (`parent@example.com` / `changeme123`) → попадаем на `/admin` (страница появится в Task 17; пока может быть 404 — это ок, редирект отработал).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: parent login/logout + admin route guard"
```

---

## Phase 5 — Админка (UI)

### Task 17: Layout админки + серверная валидация сессии + страница каталога

**Files:**
- Create: `src/lib/session.ts`, `app/admin/layout.tsx`, `app/admin/page.tsx`, `app/admin/actions.ts`

- [ ] **Step 1: Серверный резолв сессии**

`src/lib/session.ts`:
```ts
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getParentBySession, SESSION_COOKIE } from './auth'

export async function requireParent() {
  const token = cookies().get(SESSION_COOKIE)?.value ?? ''
  const parent = await getParentBySession(token)
  if (!parent) redirect('/admin/login')
  return parent
}
```

- [ ] **Step 2: Server actions админки**

`app/admin/actions.ts`:
```ts
'use server'
import { revalidatePath } from 'next/cache'
import { requireParent } from '@/lib/session'
import { adapterForUrl, adapterForPlatform } from '@/domain/platform/registry'
import { addVideoByUrl, addChannelByUrl, hideVideo, deleteChannel } from '@/domain/catalog/catalog-service'
import { syncAllChannels } from '@/domain/sync/sync-service'

export async function addByUrl(_prev: unknown, formData: FormData) {
  const parent = await requireParent()
  const url = String(formData.get('url') ?? '').trim()
  const adapter = adapterForUrl(url)
  if (!adapter) return { error: 'Пока поддерживается только Rutube. Проверьте ссылку.' }
  try {
    const res = await adapter.resolve(url)
    if (res.kind === 'video') await addVideoByUrl(parent.accountId, url, adapter)
    else await addChannelByUrl(parent.accountId, url, adapter)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Не удалось добавить ссылку' }
  }
  revalidatePath('/admin')
  return { error: '' }
}

export async function syncNow() {
  const parent = await requireParent()
  const adapter = adapterForPlatform('RUTUBE')!
  await syncAllChannels(parent.accountId, adapter)
  revalidatePath('/admin')
}

export async function hideVideoAction(formData: FormData) {
  const parent = await requireParent()
  await hideVideo(parent.accountId, String(formData.get('videoId')))
  revalidatePath('/admin')
}

export async function deleteChannelAction(formData: FormData) {
  const parent = await requireParent()
  await deleteChannel(parent.accountId, String(formData.get('channelId')))
  revalidatePath('/admin')
}
```

- [ ] **Step 3: Layout админки (сайдбар + серверная проверка)**

`app/admin/layout.tsx`:
```tsx
import type { ReactNode } from 'react'
import Link from 'next/link'
import { requireParent } from '@/lib/session'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireParent()
  return (
    <div className="flex min-h-screen">
      <aside className="w-44 bg-gray-900 p-4 text-gray-200">
        <div className="mb-4 font-extrabold text-white">SelfTube <span className="text-xs text-gray-400">admin</span></div>
        <nav className="space-y-1 text-sm">
          <Link href="/admin" className="block rounded px-2 py-1 hover:bg-gray-800">📺 Каталог</Link>
          <Link href="/admin/settings" className="block rounded px-2 py-1 hover:bg-gray-800">⚙️ Настройки</Link>
          <form action="/admin/logout" method="post"><button className="mt-4 block px-2 py-1 text-left">🚪 Выйти</button></form>
        </nav>
      </aside>
      <main className="flex-1 bg-gray-50 p-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 4: Страница каталога**

`app/admin/page.tsx`:
```tsx
import { requireParent } from '@/lib/session'
import { listAdminChannels, listAdminManualVideos } from '@/domain/catalog/catalog-service'
import { addByUrl, syncNow, hideVideoAction, deleteChannelAction } from './actions'
import { AddForm } from './AddForm'

export default async function AdminCatalog() {
  const parent = await requireParent()
  const [channels, videos] = await Promise.all([
    listAdminChannels(parent.accountId),
    listAdminManualVideos(parent.accountId),
  ])
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <div className="flex-1"><AddForm action={addByUrl} /></div>
        <form action={syncNow}><button className="rounded-lg bg-gray-700 px-4 py-2 text-white">↻ Синхронизировать</button></form>
      </div>

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase text-gray-500">Одобренные каналы</h2>
        <div className="divide-y rounded-xl border bg-white">
          {channels.length === 0 ? <p className="p-3 text-sm text-gray-400">Пока нет каналов</p> : channels.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3">
              <img src={c.thumbnailUrl || '/placeholder.png'} alt="" className="h-10 w-10 rounded-lg object-cover" />
              <div className="flex-1">
                <div className="text-sm font-bold">{c.title}</div>
                <div className="text-xs text-gray-500">{c._count.videos} видео · {c.lastSyncedAt ? `синхр. ${c.lastSyncedAt.toLocaleString('ru')}` : 'не синхронизирован'}</div>
              </div>
              <form action={deleteChannelAction}><input type="hidden" name="channelId" value={c.id} /><button className="text-xs text-red-600">Удалить</button></form>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase text-gray-500">Отдельные видео</h2>
        <div className="grid grid-cols-3 gap-3">
          {videos.map((v) => (
            <div key={v.id} className="rounded-xl border bg-white p-2">
              <img src={v.thumbnailUrl} alt="" className="h-24 w-full rounded-lg object-cover" />
              <div className="mt-1 text-xs font-semibold">{v.title}</div>
              <form action={hideVideoAction}><input type="hidden" name="videoId" value={v.id} /><button className="mt-1 text-xs text-red-600">Скрыть</button></form>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 5: Клиентская форма добавления (с состоянием ошибки)**

`app/admin/AddForm.tsx`:
```tsx
'use client'
import { useFormState } from 'react-dom'

export function AddForm({ action }: { action: (prev: unknown, fd: FormData) => Promise<{ error: string }> }) {
  const [state, formAction] = useFormState(action, { error: '' })
  return (
    <form action={formAction}>
      <div className="flex gap-2">
        <input name="url" placeholder="Вставьте ссылку на канал или видео Rutube…" className="flex-1 rounded-lg border p-2" />
        <button className="rounded-lg bg-orange-500 px-4 py-2 font-bold text-white">+ Добавить</button>
      </div>
      {state.error ? <p className="mt-1 text-sm text-red-600">{state.error}</p> : null}
    </form>
  )
}
```

- [ ] **Step 6: Ручная проверка**

Run: `npm run dev`, войти в `/admin`, вставить реальную ссылку на видео Rutube → появляется в «Отдельные видео»; вставить ссылку на канал → появляется в «Каналы» с числом видео. Нажать «Синхронизировать» — без ошибок.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: admin catalog UI (add by url, list, hide, delete, sync)"
```

---

### Task 18: Страница настроек (лимит времени)

**Files:**
- Create: `app/admin/settings/page.tsx`, `app/admin/settings/actions.ts`

- [ ] **Step 1: Server action**

`app/admin/settings/actions.ts`:
```ts
'use server'
import { revalidatePath } from 'next/cache'
import { requireParent } from '@/lib/session'
import { setDailyLimit } from '@/domain/timelimit/timelimit-service'

export async function saveLimit(formData: FormData) {
  const parent = await requireParent()
  const raw = String(formData.get('minutes') ?? '').trim()
  const minutes = raw === '' ? null : Math.max(0, parseInt(raw, 10) || 0)
  await setDailyLimit(parent.accountId, minutes)
  revalidatePath('/admin/settings')
}
```

- [ ] **Step 2: Страница**

`app/admin/settings/page.tsx`:
```tsx
import { requireParent } from '@/lib/session'
import { getStatus } from '@/domain/timelimit/timelimit-service'
import { saveLimit } from './actions'

export default async function SettingsPage() {
  const parent = await requireParent()
  const status = await getStatus(parent.accountId)
  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-bold">Настройки</h1>
      <form action={saveLimit} className="space-y-2">
        <label className="block text-sm font-semibold">Лимит времени в день (минут)</label>
        <input name="minutes" type="number" min={0} defaultValue={status.dailyLimitMinutes ?? ''} placeholder="без лимита" className="w-full rounded-lg border p-2" />
        <p className="text-xs text-gray-500">Пусто = без лимита. Сегодня просмотрено: {Math.round(status.secondsWatched / 60)} мин.</p>
        <button className="rounded-lg bg-orange-500 px-4 py-2 font-bold text-white">Сохранить</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Ручная проверка**

Открыть `/admin/settings`, задать лимит 30, сохранить → значение сохраняется после перезагрузки.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: admin settings page (daily time limit)"
```

---

## Phase 6 — Детская часть (UI)

### Task 19: Детская главная (сетка, стиль «детский»)

**Files:**
- Create: `app/(kids)/layout.tsx`, `app/(kids)/page.tsx`, `src/components/kids/VideoCard.tsx`, `src/components/kids/KidsHeader.tsx`

- [ ] **Step 1: Хедер (поиск + остаток времени)**

`src/components/kids/KidsHeader.tsx`:
```tsx
import Link from 'next/link'

export function KidsHeader({ remainingMinutes }: { remainingMinutes: number | null }) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 bg-amber-100 p-3">
      <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-lg">🦊</Link>
      <form action="/search" className="flex-1">
        <input name="q" placeholder="🔍 Что посмотрим?" className="w-full rounded-full bg-white px-4 py-2 text-sm" />
      </form>
      {remainingMinutes !== null ? (
        <span className="rounded-full bg-green-500 px-3 py-1.5 text-xs font-bold text-white">⏱ {remainingMinutes} мин</span>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 2: Карточка видео**

`src/components/kids/VideoCard.tsx`:
```tsx
import Link from 'next/link'

export function VideoCard({ id, title, thumbnailUrl }: { id: string; title: string; thumbnailUrl: string }) {
  return (
    <Link href={`/watch/${id}`} className="block rounded-2xl bg-white p-1.5 shadow">
      <img src={thumbnailUrl} alt="" className="h-28 w-full rounded-xl object-cover" />
      <div className="mt-1 line-clamp-2 px-1 text-sm font-bold text-gray-800">{title}</div>
    </Link>
  )
}
```

- [ ] **Step 3: Layout детской части**

`app/(kids)/layout.tsx`:
```tsx
import type { ReactNode } from 'react'
export default function KidsLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-amber-50">{children}</div>
}
```

- [ ] **Step 4: Главная**

`app/(kids)/page.tsx`:
```tsx
import { getCurrentAccountId } from '@/lib/account'
import { listChildCatalog } from '@/domain/catalog/catalog-service'
import { getStatus } from '@/domain/timelimit/timelimit-service'
import { KidsHeader } from '@/components/kids/KidsHeader'
import { VideoCard } from '@/components/kids/VideoCard'
import { remainingSeconds } from '@/domain/timelimit/timelimit'

export const dynamic = 'force-dynamic'

export default async function KidsHome() {
  const accountId = await getCurrentAccountId()
  const [videos, status] = await Promise.all([listChildCatalog(accountId), getStatus(accountId)])
  const remMin = status.dailyLimitMinutes === null ? null : Math.ceil(status.remainingSeconds / 60)
  return (
    <div>
      <KidsHeader remainingMinutes={remMin} />
      <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-4">
        {videos.map((v) => <VideoCard key={v.id} id={v.id} title={v.title} thumbnailUrl={v.thumbnailUrl} />)}
      </div>
      {videos.length === 0 ? <p className="p-6 text-center text-gray-500">Пока нет видео. Попроси родителя добавить 🙂</p> : null}
    </div>
  )
}
```

- [ ] **Step 5: Ручная проверка**

Открыть http://localhost:3000/ → сетка одобренных видео в детском стиле, остаток времени (если лимит задан).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: kids home grid (playful style, header with time)"
```

---

### Task 20: Поиск по каталогу

**Files:**
- Create: `app/(kids)/search/page.tsx`

- [ ] **Step 1: Страница поиска**

`app/(kids)/search/page.tsx`:
```tsx
import { getCurrentAccountId } from '@/lib/account'
import { searchChildCatalog } from '@/domain/catalog/catalog-service'
import { getStatus } from '@/domain/timelimit/timelimit-service'
import { KidsHeader } from '@/components/kids/KidsHeader'
import { VideoCard } from '@/components/kids/VideoCard'

export const dynamic = 'force-dynamic'

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const accountId = await getCurrentAccountId()
  const q = searchParams.q ?? ''
  const [videos, status] = await Promise.all([searchChildCatalog(accountId, q), getStatus(accountId)])
  const remMin = status.dailyLimitMinutes === null ? null : Math.ceil(status.remainingSeconds / 60)
  return (
    <div>
      <KidsHeader remainingMinutes={remMin} />
      <p className="px-4 pt-3 text-sm text-gray-600">Результаты по запросу «{q}»: {videos.length}</p>
      <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-4">
        {videos.map((v) => <VideoCard key={v.id} id={v.id} title={v.title} thumbnailUrl={v.thumbnailUrl} />)}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Ручная проверка**

В хедере ввести запрос → на `/search?q=...` только совпадения из каталога (никакого выхода в общий Rutube).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: kids catalog search"
```

---

### Task 21: Экран просмотра (интеграция SafePlayer + блокировка по лимиту + пульс)

**Files:**
- Create: `app/(kids)/watch/[videoId]/page.tsx`, `app/(kids)/watch/[videoId]/WatchClient.tsx`, `app/api/heartbeat/route.ts`
- Test: `app/api/heartbeat/route.test.ts`

- [ ] **Step 1: Тест API-пульса (интеграционный)**

`app/api/heartbeat/route.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { getStatus } from '@/domain/timelimit/timelimit-service'
import { POST } from './route'
import { DEFAULT_ACCOUNT_ID } from '@/lib/account'

beforeEach(async () => {
  await db.dailyUsage.deleteMany({ where: { accountId: DEFAULT_ACCOUNT_ID } })
  await db.account.upsert({ where: { id: DEFAULT_ACCOUNT_ID }, update: {}, create: { id: DEFAULT_ACCOUNT_ID } })
})

describe('POST /api/heartbeat', () => {
  it('добавляет секунды и возвращает статус', async () => {
    const req = new Request('http://x/api/heartbeat', { method: 'POST', body: JSON.stringify({ seconds: 5 }) })
    const res = await POST(req)
    const json = await res.json()
    expect(json.blocked).toBe(false)
    const status = await getStatus(DEFAULT_ACCOUNT_ID)
    expect(status.secondsWatched).toBe(5)
  })

  it('ограничивает секунды сверху (защита от накрутки)', async () => {
    const req = new Request('http://x/api/heartbeat', { method: 'POST', body: JSON.stringify({ seconds: 99999 }) })
    await POST(req)
    const status = await getStatus(DEFAULT_ACCOUNT_ID)
    expect(status.secondsWatched).toBeLessThanOrEqual(30)
  })
})
```

- [ ] **Step 2: Запустить — падение**

Run: `npm test app/api/heartbeat/route.test.ts`
Expected: FAIL.

- [ ] **Step 3: Роут пульса**

`app/api/heartbeat/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { getCurrentAccountId } from '@/lib/account'
import { addWatchedSeconds, getStatus } from '@/domain/timelimit/timelimit-service'

const MAX_TICK = 30 // не доверяем клиенту больше, чем разумный интервал пульса

export async function POST(req: Request) {
  const accountId = await getCurrentAccountId()
  const body = await req.json().catch(() => ({}))
  const seconds = Math.min(MAX_TICK, Math.max(0, Number(body.seconds) || 0))
  await addWatchedSeconds(accountId, seconds)
  const status = await getStatus(accountId)
  return NextResponse.json({ blocked: status.blocked, remainingSeconds: status.remainingSeconds })
}
```

- [ ] **Step 4: Запустить тест**

Run: `npm test app/api/heartbeat/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Клиентская обёртка просмотра**

`app/(kids)/watch/[videoId]/WatchClient.tsx`:
```tsx
'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SafePlayer } from '@/components/SafePlayer/SafePlayer'

type Suggestion = { id: string; title: string; thumbnailUrl: string }

export function WatchClient({ embedUrl, suggestions, initiallyBlocked }: {
  embedUrl: string; suggestions: Suggestion[]; initiallyBlocked: boolean
}) {
  const router = useRouter()
  const [ended, setEnded] = useState(false)
  const [blocked, setBlocked] = useState(initiallyBlocked)

  const onTick = useCallback(async (seconds: number) => {
    const res = await fetch('/api/heartbeat', { method: 'POST', body: JSON.stringify({ seconds }) })
    const json = await res.json()
    if (json.blocked) setBlocked(true)
  }, [])

  if (blocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-amber-50 p-6 text-center">
        <div className="text-2xl font-extrabold text-gray-800">На сегодня всё! ⏰</div>
        <p className="mt-2 text-gray-600">Время просмотра на сегодня закончилось.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-3">
      <button onClick={() => router.push('/')} className="mb-3 rounded-full bg-white px-4 py-1.5 text-sm font-bold shadow">‹ Назад</button>
      {!ended ? (
        <SafePlayer embedUrl={embedUrl} onEnded={() => setEnded(true)} onTick={onTick} />
      ) : (
        <div className="rounded-2xl bg-amber-100 p-5">
          <div className="text-center text-lg font-extrabold text-gray-800">🎉 Видео закончилось!</div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {suggestions.map((s) => (
              <button key={s.id} onClick={() => router.push(`/watch/${s.id}`)} className="rounded-2xl bg-white p-1.5 text-left shadow">
                <img src={s.thumbnailUrl} alt="" className="h-20 w-full rounded-xl object-cover" />
                <div className="mt-1 line-clamp-2 px-1 text-xs font-bold">{s.title}</div>
              </button>
            ))}
          </div>
          <div className="mt-3 text-center">
            <button onClick={() => setEnded(false)} className="rounded-full bg-orange-500 px-5 py-2 text-sm font-bold text-white">↺ Смотреть снова</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Серверная страница просмотра**

`app/(kids)/watch/[videoId]/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { getCurrentAccountId } from '@/lib/account'
import { listChildCatalog } from '@/domain/catalog/catalog-service'
import { getStatus } from '@/domain/timelimit/timelimit-service'
import { WatchClient } from './WatchClient'

export const dynamic = 'force-dynamic'

export default async function WatchPage({ params }: { params: { videoId: string } }) {
  const accountId = await getCurrentAccountId()
  const video = await db.video.findFirst({ where: { id: params.videoId, accountId } })
  if (!video || video.hidden) notFound()

  const [catalog, status] = await Promise.all([listChildCatalog(accountId), getStatus(accountId)])
  const suggestions = catalog.filter((v) => v.id !== video.id).slice(0, 6)
    .map((v) => ({ id: v.id, title: v.title, thumbnailUrl: v.thumbnailUrl }))

  return (
    <WatchClient
      embedUrl={video.embedUrl}
      suggestions={suggestions}
      initiallyBlocked={status.blocked}
    />
  )
}
```

- [ ] **Step 7: Ручная проверка**

Открыть видео из главной → играет в SafePlayer; при заданном малом лимите после нескольких пульсов появляется экран «На сегодня всё!»; по окончании видео — подборка из каталога.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: kids watch screen (SafePlayer + heartbeat + time-limit block + end suggestions)"
```

---

## Phase 7 — Периодическая синхронизация, PWA, финал

### Task 22: Фоновая синхронизация по интервалу

**Files:**
- Create: `src/lib/scheduler.ts`
- Modify: `app/layout.tsx` (запуск планировщика на сервере)

- [ ] **Step 1: Планировщик (идемпотентный, один на процесс)**

`src/lib/scheduler.ts`:
```ts
import { getCurrentAccountId } from '@/lib/account'
import { adapterForPlatform } from '@/domain/platform/registry'
import { syncAllChannels } from '@/domain/sync/sync-service'

const g = globalThis as unknown as { __selftubeSync?: boolean }
const INTERVAL_MS = 6 * 60 * 60 * 1000 // раз в 6 часов

export function startScheduler() {
  if (g.__selftubeSync) return
  g.__selftubeSync = true
  const run = async () => {
    try {
      const accountId = await getCurrentAccountId()
      const adapter = adapterForPlatform('RUTUBE')
      if (adapter) await syncAllChannels(accountId, adapter)
    } catch (e) {
      console.error('scheduled sync failed', e)
    }
  }
  setInterval(run, INTERVAL_MS)
}
```

- [ ] **Step 2: Запуск из корневого layout (только сервер)**

В `app/layout.tsx` добавить импорт и вызов перед экспортом компонента:
```tsx
import { startScheduler } from '@/lib/scheduler'
// ...
if (typeof window === 'undefined') startScheduler()
```
(Алиас `@/* -> ./src/*` уже настроен в Task 1, поэтому `@/lib/scheduler` резолвится в `src/lib/scheduler.ts`.)

- [ ] **Step 3: Ручная проверка**

`npm run dev` — в логах нет ошибок планировщика; повторные запросы не плодят несколько интервалов (флаг в globalThis).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: periodic channel sync scheduler (every 6h, idempotent)"
```

---

### Task 23: PWA (манифест + иконки)

**Files:**
- Create: `public/manifest.webmanifest`, `public/icon-192.png`, `public/icon-512.png`
- Modify: `app/layout.tsx` (ссылка на манифест)

- [ ] **Step 1: Манифест**

`public/manifest.webmanifest`:
```json
{
  "name": "SelfTube",
  "short_name": "SelfTube",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#fffbeb",
  "theme_color": "#f97316",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Иконки**

Положить два PNG (192×192 и 512×512) в `public/`. Можно временно сгенерировать однотонные плейсхолдеры с эмодзи-лисой; заменить позже.

- [ ] **Step 3: Подключить манифест в `<head>`**

В `app/layout.tsx` в `metadata` добавить:
```tsx
export const metadata = {
  title: 'SelfTube',
  description: 'Видео для детей',
  manifest: '/manifest.webmanifest',
  themeColor: '#f97316',
}
```

- [ ] **Step 4: Ручная проверка**

В браузере (DevTools → Application → Manifest) манифест распознан, иконки видны, приложение устанавливается на планшет как PWA.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: PWA manifest and icons"
```

---

### Task 24: Финальная проверка изоляции + чистка

**Files:**
- Modify: удалить `app/spike/page.tsx` и `src/index.ts` (артефакты скелета), `dist/` при наличии
- Modify: `README.md` (создать при отсутствии)

- [ ] **Step 1: Прогнать все тесты**

Run: `npm test`
Expected: все тесты зелёные.

- [ ] **Step 2: Финальный чек-лист изоляции (ручной, критично)**

На реальном устройстве/в браузере пройти по пунктам и отметить:
- [ ] На экране просмотра клики по области плеера НЕ уводят со страницы и не открывают новых вкладок (sandbox работает).
- [ ] Родной UI Rutube (логотип, «похожие») не кликается сквозь наш слой.
- [ ] По окончании видео показывается НАШ экран с подборкой из каталога, а не сетка Rutube.
- [ ] При «поломанном» видео (например, битый ID) SafePlayer показывает «видео временно недоступно» (fail-closed), а не пустой/чужой плеер.
- [ ] Поиск ребёнка возвращает только элементы каталога.
- [ ] По достижении лимита появляется «На сегодня всё!» и просмотр недоступен.

- [ ] **Step 3: Удалить артефакты скелета**

Run:
```bash
rm -f app/spike/page.tsx src/index.ts
rm -rf dist
```
(Убедиться, что на `src/index.ts` нет импортов — это был файл-заглушка скелета.)

- [ ] **Step 4: README**

`README.md` — краткая инструкция: установка, `.env`, `npm run db:push`, `npm run db:seed`, `npm run dev`, вход в `/admin`, как добавить канал/видео, где менять лимит времени, ограничения v1 (только Rutube).

- [ ] **Step 5: Финальный прогон и коммит**

Run: `npm test && npm run build`
Expected: тесты зелёные, production-сборка проходит.
```bash
git add -A
git commit -m "chore: final isolation checks, remove scaffold artifacts, add README"
```

---

## Порядок и зависимости

- **Phase 0** (задачи 1–3) — фундамент, строго первым.
- **Phase 1** (задачи 4–5) — спайк плеера сразу после фундамента (снятие главного риска по спеку).
- **Phase 2–3** (задачи 6–14) — доменный слой; можно вести параллельно с UI-фазами после готовности типов (Task 6).
- **Phase 4** (15–16) — авторизация до админки.
- **Phase 5** (17–18) — админка (зависит от каталога/синка/лимита и auth).
- **Phase 6** (19–21) — детская часть (зависит от каталога, лимита, SafePlayer).
- **Phase 7** (22–24) — планировщик, PWA, финал.

## Соответствие спеку (самопроверка)

- Каталог: каналы + отдельные видео → Task 11, 17. ✓
- v1 только Rutube, адаптеры для расширения → Task 6–9. ✓
- SaaS-готовность (Account на всём) → Task 2, 3. ✓
- Планшет/PWA → Task 19, 23. ✓
- Один общий список → модель без профилей. ✓
- Максимально строгая изоляция (sandbox + оболочка + fail-closed) → Task 4, 5, 21, 24. ✓
- Поиск по каталогу → Task 20. ✓
- Лимит времени (общий на день) → Task 13, 14, 18, 21. ✓
- Авторизация родителя → Task 15, 16, 17. ✓
- Синхронизация по кнопке + интервал → Task 12, 17, 22. ✓
- Обработка ошибок (fail-closed, битые ссылки, недоступный API) → Task 5, 8, 17, 21, 24. ✓
