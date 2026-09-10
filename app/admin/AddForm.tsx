'use client'
import { useFormState } from 'react-dom'

export function AddForm({ action }: { action: (prev: unknown, fd: FormData) => Promise<{ error: string }> }) {
  const [state, formAction] = useFormState(action, { error: '' })
  return (
    <form action={formAction}>
      <div className="flex gap-2">
        <input name="url" placeholder="Ссылка на канал, плейлист или видео Rutube…" className="flex-1 rounded-lg border p-2" />
        <button className="rounded-lg bg-orange-500 px-4 py-2 font-bold text-white">+ Добавить</button>
      </div>
      {state.error ? <p className="mt-1 text-sm text-red-600">{state.error}</p> : null}
    </form>
  )
}
