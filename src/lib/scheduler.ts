/**
 * Периодическая синхронизация — СЕЙЧАС НЕ ИСПОЛЬЗУЕТСЯ.
 *
 * Каталог обновляется вручную, кнопкой «Синхронизировать» в админке. Модуль
 * оставлен на будущее: включается раскомментированием двух строк в app/layout.tsx.
 *
 * Если будете включать, учтите две особенности схемы «таймер внутри процесса»:
 *   1. Отсчёт идёт от старта процесса, а не от календарного времени — деплой
 *      обнуляет его, и при частых выкатках синк может не случиться ни разу.
 *   2. Машина на хостинге не должна засыпать (в fly.toml — auto_stop_machines),
 *      иначе таймеру негде тикать. Это стоит денег.
 * Для боевого расписания надёжнее эндпоинт с токеном и внешний cron
 * (GitHub Actions или Vercel Cron) — он переживает перезапуски и виден в логах.
 */
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
