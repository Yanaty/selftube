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
