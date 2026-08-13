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
