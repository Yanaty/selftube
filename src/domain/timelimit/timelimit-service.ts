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
