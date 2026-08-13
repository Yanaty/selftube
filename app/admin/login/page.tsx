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
