import { requireParent } from '@/lib/session'
import { getStatus } from '@/domain/timelimit/timelimit-service'
import { verifyParent } from '@/lib/auth'
import { saveLimit, changePassword } from './actions'
import { ChangePasswordForm } from './ChangePasswordForm'

const DEFAULT_SEED_PASSWORD = 'changeme123'

export default async function SettingsPage() {
  const parent = await requireParent()
  const status = await getStatus(parent.accountId)
  // Приложение доступно из интернета — пароль из сида здесь равносилен открытой двери.
  const usesDefaultPassword = (await verifyParent(parent.email, DEFAULT_SEED_PASSWORD)) !== null
  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-bold">Настройки</h1>
      {usesDefaultPassword ? (
        <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Пароль всё ещё стандартный из установки. Смените его — иначе в админку войдёт кто угодно.
        </p>
      ) : null}
      <form action={saveLimit} className="space-y-2">
        <label className="block text-sm font-semibold">Лимит времени в день (минут)</label>
        <input name="minutes" type="number" min={0} defaultValue={status.dailyLimitMinutes ?? ''} placeholder="без лимита" className="w-full rounded-lg border p-2" />
        <p className="text-xs text-gray-500">Пусто = без лимита. Сегодня просмотрено: {Math.round(status.secondsWatched / 60)} мин.</p>
        <button className="rounded-lg bg-orange-500 px-4 py-2 font-bold text-white">Сохранить</button>
      </form>

      <div className="border-t pt-4">
        <ChangePasswordForm action={changePassword} />
        <p className="mt-1 text-xs text-gray-500">Остальные входы будут завершены, ваш останется.</p>
      </div>
    </div>
  )
}
