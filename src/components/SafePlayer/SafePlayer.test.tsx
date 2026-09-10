import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
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
