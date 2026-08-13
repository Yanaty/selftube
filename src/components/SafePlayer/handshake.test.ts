import { describe, it, expect } from 'vitest'
import { createHandshake } from './handshake'

describe('handshake (fail-closed)', () => {
  it('стартует в состоянии connecting', () => {
    const h = createHandshake(2000)
    expect(h.state()).toBe('connecting')
  })

  it('переходит в ready при подтверждении плеера', () => {
    const h = createHandshake(2000)
    h.onPlayerReady()
    expect(h.state()).toBe('ready')
  })

  it('переходит в failed по таймауту без подтверждения', () => {
    const h = createHandshake(2000)
    h.onTimeout()
    expect(h.state()).toBe('failed')
  })

  it('после ready таймаут уже не роняет в failed', () => {
    const h = createHandshake(2000)
    h.onPlayerReady()
    h.onTimeout()
    expect(h.state()).toBe('ready')
  })

  it('timeoutMs доступен для планирования таймера', () => {
    const h = createHandshake(1500)
    expect(h.timeoutMs).toBe(1500)
  })
})
