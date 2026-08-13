export type VisibilityInput = {
  hidden: boolean
  sourceType: 'MANUAL' | 'CHANNEL'
  channelEnabled: boolean
}

export function isVisibleToChild(v: VisibilityInput): boolean {
  if (v.hidden) return false
  if (v.sourceType === 'CHANNEL' && !v.channelEnabled) return false
  return true
}
