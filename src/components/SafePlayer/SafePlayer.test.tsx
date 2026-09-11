import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { SafePlayer } from './SafePlayer'

// Плеер живёт в кросс-доменном iframe, поэтому в тестах подменяем contentWindow
// заглушкой и смотрим, какие команды реально уходят в Rutube.
let posted: Array<{ type: string; data: any }>

function lastPosted() {
  return posted[posted.length - 1]
}

function playerSays(type: string, data: Record<string, unknown> = {}) {
  fireEvent(
    window,
    new MessageEvent('message', {
      origin: 'https://rutube.ru',
      data: JSON.stringify({ type, data }),
    }),
  )
}

function renderPlayer(props: Partial<React.ComponentProps<typeof SafePlayer>> = {}) {
  const result = render(
    <SafePlayer embedUrl="https://rutube.ru/play/embed/abc" onEnded={() => {}} {...props} />,
  )
  playerSays('player:ready')
  return result
}

beforeEach(() => {
  posted = []
  vi.spyOn(HTMLIFrameElement.prototype, 'contentWindow', 'get').mockReturnValue({
    postMessage: (msg: string) => posted.push(JSON.parse(msg)),
  } as unknown as Window)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('SafePlayer — звук', () => {
  it('второй тап по кнопке звука включает его обратно (mute → unMute)', () => {
    renderPlayer()
    const button = screen.getByLabelText(/звук/i)

    fireEvent.click(button)
    expect(lastPosted().type).toBe('player:mute')

    fireEvent.click(button)
    expect(lastPosted().type).toBe('player:unMute')
  })

  it('подхватывает громкость от самого плеера', () => {
    renderPlayer()
    // Плеер сообщил, что звук выключен не нами (например, автоплей без звука).
    playerSays('player:volumeChange', { volume: 0 })

    // Значит следующий тап должен включать звук, а не выключать.
    fireEvent.click(screen.getByLabelText(/звук/i))
    expect(lastPosted().type).toBe('player:unMute')
  })
})

describe('SafePlayer — перемотка', () => {
  it('показывает позицию и длительность, о которых сообщил плеер', () => {
    renderPlayer()
    playerSays('player:durationChange', { duration: 100 })
    playerSays('player:currentTime', { time: 10, duration: 100 })

    const slider = screen.getByLabelText(/перемотка/i) as HTMLInputElement
    expect(slider.max).toBe('100')
    expect(slider.value).toBe('10')
  })

  it('берёт длительность из каталога, пока плеер молчит', () => {
    renderPlayer({ durationSec: 42 })
    expect((screen.getByLabelText(/перемотка/i) as HTMLInputElement).max).toBe('42')
  })

  it('по окончании перетаскивания шлёт setCurrentTime', () => {
    renderPlayer({ durationSec: 100 })
    const slider = screen.getByLabelText(/перемотка/i)

    fireEvent.change(slider, { target: { value: '50' } })
    fireEvent.pointerUp(slider)

    expect(lastPosted()).toEqual({ type: 'player:setCurrentTime', data: { time: 50 } })
  })

  it('во время перетаскивания не дёргает ползунок обратно', () => {
    renderPlayer({ durationSec: 100 })
    const slider = screen.getByLabelText(/перемотка/i) as HTMLInputElement

    fireEvent.change(slider, { target: { value: '50' } })
    playerSays('player:currentTime', { time: 12, duration: 100 })

    expect(slider.value).toBe('50')
  })
})

describe('SafePlayer — перемотка вперёд', () => {
  it('кнопка вперёд отматывает на 10 секунд от текущей позиции', () => {
    renderPlayer({ durationSec: 100 })
    playerSays('player:currentTime', { time: 30, duration: 100 })

    fireEvent.click(screen.getByLabelText(/вперёд/i))
    expect(lastPosted()).toEqual({ type: 'player:setCurrentTime', data: { time: 40 } })
  })

  it('не перепрыгивает за конец видео', () => {
    renderPlayer({ durationSec: 100 })
    playerSays('player:currentTime', { time: 95, duration: 100 })

    fireEvent.click(screen.getByLabelText(/вперёд/i))
    expect(lastPosted()).toEqual({ type: 'player:setCurrentTime', data: { time: 100 } })
  })
})

describe('SafePlayer — панель управления прячется', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
  afterEach(() => vi.useRealTimers())

  const controls = () => screen.getByTestId('player-controls')

  function startPlaying() {
    playerSays('player:changeState', { state: 'playing' })
  }

  it('во время просмотра уходит сама, если её не трогают', () => {
    renderPlayer({ durationSec: 100 })
    startPlaying()
    expect(controls().dataset.visible).toBe('true')

    act(() => { vi.advanceTimersByTime(3500) })
    expect(controls().dataset.visible).toBe('false')
  })

  it('возвращается от движения мыши', () => {
    renderPlayer({ durationSec: 100 })
    startPlaying()
    act(() => { vi.advanceTimersByTime(3500) })

    fireEvent.pointerMove(screen.getByTestId('player-surface'))
    expect(controls().dataset.visible).toBe('true')
  })

  it('на паузе остаётся на экране', () => {
    renderPlayer({ durationSec: 100 })
    startPlaying()
    playerSays('player:changeState', { state: 'pause' })

    act(() => { vi.advanceTimersByTime(5000) })
    expect(controls().dataset.visible).toBe('true')
  })

  it('не прячется, пока ребёнок тащит ползунок', () => {
    renderPlayer({ durationSec: 100 })
    startPlaying()
    fireEvent.change(screen.getByLabelText(/перемотка/i), { target: { value: '50' } })

    act(() => { vi.advanceTimersByTime(5000) })
    expect(controls().dataset.visible).toBe('true')
  })
})

describe('SafePlayer — полный экран', () => {
  it('просит браузер развернуть наш контейнер, а не плеер Rutube', () => {
    const request = vi.fn()
    Object.defineProperty(Element.prototype, 'requestFullscreen', { value: request, configurable: true, writable: true })
    Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true })

    renderPlayer()
    fireEvent.click(screen.getByLabelText(/полный экран/i))

    expect(request).toHaveBeenCalled()
    // Команды enterFullscreen плееру не шлём: это подняло бы родной UI Rutube
    // поверх нашего оверлея.
    expect(posted.some((m) => m.type === 'player:enterFullscreen')).toBe(false)
  })

  it('без поддержки API растягивает контейнер средствами CSS', () => {
    Object.defineProperty(Element.prototype, 'requestFullscreen', { value: undefined, configurable: true, writable: true })
    Object.defineProperty(document, 'fullscreenEnabled', { value: false, configurable: true })

    renderPlayer()
    fireEvent.click(screen.getByLabelText(/полный экран/i))

    expect(screen.getByTestId('player-surface').className).toMatch(/fixed/)
  })
})
