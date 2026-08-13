import { describe, it, expect } from 'vitest'
import { isVisibleToChild } from './visibility'

const base = { hidden: false, sourceType: 'MANUAL' as const, channelEnabled: true }

describe('isVisibleToChild', () => {
  it('ручное видимо', () => {
    expect(isVisibleToChild(base)).toBe(true)
  })
  it('скрытое невидимо', () => {
    expect(isVisibleToChild({ ...base, hidden: true })).toBe(false)
  })
  it('видео из выключенного канала невидимо', () => {
    expect(isVisibleToChild({ hidden: false, sourceType: 'CHANNEL', channelEnabled: false })).toBe(false)
  })
  it('видео из включённого канала видимо', () => {
    expect(isVisibleToChild({ hidden: false, sourceType: 'CHANNEL', channelEnabled: true })).toBe(true)
  })
})
