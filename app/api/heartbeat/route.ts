import { NextResponse } from 'next/server'
import { getCurrentAccountId } from '@/lib/account'
import { addWatchedSeconds, getStatus } from '@/domain/timelimit/timelimit-service'

const MAX_TICK = 30

export async function POST(req: Request) {
  const accountId = await getCurrentAccountId()
  const body = await req.json().catch(() => ({}))
  const seconds = Math.min(MAX_TICK, Math.max(0, Number(body.seconds) || 0))
  await addWatchedSeconds(accountId, seconds)
  const status = await getStatus(accountId)
  return NextResponse.json({ blocked: status.blocked, remainingSeconds: status.remainingSeconds })
}
