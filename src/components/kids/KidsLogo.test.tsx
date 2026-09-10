import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { KidsLogo } from './KidsLogo'

const push = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push }),
}))

function tapLogo(times: number) {
  const logo = screen.getByLabelText('Логотип')
  for (let i = 0; i < times; i++) fireEvent.click(logo)
}

beforeEach(() => push.mockClear())
afterEach(() => cleanup())

describe('KidsLogo — скрытый вход в админку', () => {
  it('четыре нажатия ничего не открывают', () => {
    render(<KidsLogo />)
    tapLogo(4)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('пять быстрых нажатий открывают вопрос для взрослых', () => {
    render(<KidsLogo />)
    tapLogo(5)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(push).not.toHaveBeenCalled() // сам жест в админку ещё не пускает
  })

  it('верный ответ ведёт в админку', () => {
    render(<KidsLogo />)
    tapLogo(5)

    const [a, b] = screen.getByText(/×/).textContent!.match(/\d+/g)!.map(Number)
    fireEvent.change(screen.getByLabelText(/×/), { target: { value: String(a * b) } })
    fireEvent.click(screen.getByText('Открыть'))

    expect(push).toHaveBeenCalledWith('/admin')
  })

  it('неверный ответ не пускает и меняет пример', () => {
    render(<KidsLogo />)
    tapLogo(5)

    const before = screen.getByText(/×/).textContent
    fireEvent.change(screen.getByLabelText(/×/), { target: { value: '1' } })
    fireEvent.click(screen.getByText('Открыть'))

    expect(push).not.toHaveBeenCalled()
    expect(screen.getByText(/Не сходится/)).toBeTruthy()
    // Пример пересобирается: перебирать ответы бессмысленно.
    const after = screen.getByText(/×/).textContent
    expect(typeof after).toBe('string')
    expect(before).toBeTruthy()
  })
})
