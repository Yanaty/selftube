'use client'
import { useFormState } from 'react-dom'

export function ChangePasswordForm({
  action,
}: {
  action: (prev: unknown, fd: FormData) => Promise<{ error: string; ok: string }>
}) {
  const [state, formAction] = useFormState(action, { error: '', ok: '' })
  return (
    <form action={formAction} className="space-y-2">
      <label className="block text-sm font-semibold">Сменить пароль</label>
      <input name="current" type="password" autoComplete="current-password" placeholder="Текущий пароль" className="w-full rounded-lg border p-2" />
      <input name="next" type="password" autoComplete="new-password" placeholder="Новый пароль (от 8 символов)" className="w-full rounded-lg border p-2" />
      <button className="rounded-lg bg-gray-700 px-4 py-2 font-bold text-white">Сменить</button>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-green-700">{state.ok}</p> : null}
    </form>
  )
}
