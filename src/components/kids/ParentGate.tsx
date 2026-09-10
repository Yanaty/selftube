'use client'
import { useEffect, useState, type FormEvent } from 'react'
import { makeQuestion, isCorrect, type Question } from './gate-logic'

/** Окно «только для взрослых»: пример на умножение перед входом в админку. */
export function ParentGate({ onClose, onPass }: { onClose: () => void; onPass: () => void }) {
  const [question, setQuestion] = useState<Question>(() => makeQuestion())
  const [value, setValue] = useState('')
  const [wrong, setWrong] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (isCorrect(value, question)) {
      onPass()
      return
    }
    // На каждую ошибку — новый пример, чтобы ответ нельзя было подобрать перебором.
    setQuestion(makeQuestion())
    setValue('')
    setWrong(true)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="parent-gate-title"
      onClick={onClose}
    >
      <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 id="parent-gate-title" className="text-base font-extrabold text-gray-800">Только для взрослых</h2>
        <p className="mt-1 text-sm text-gray-500">Решите пример, чтобы открыть настройки.</p>
        <form onSubmit={submit} className="mt-4">
          <label htmlFor="parent-gate-answer" className="block text-center text-2xl font-extrabold text-gray-800">
            {question.a} × {question.b} = ?
          </label>
          <input
            id="parent-gate-answer"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="numeric"
            autoFocus
            autoComplete="off"
            className="mt-3 w-full rounded-xl border border-gray-300 p-2 text-center text-lg"
          />
          {wrong ? <p className="mt-2 text-center text-sm text-red-600">Не сходится. Вот другой пример.</p> : null}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold text-gray-600">
              Отмена
            </button>
            <button type="submit" className="flex-1 rounded-xl bg-orange-500 px-3 py-2 text-sm font-bold text-white">
              Открыть
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
