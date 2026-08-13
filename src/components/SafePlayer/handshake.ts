export type HandshakeState = 'connecting' | 'ready' | 'failed'

export function createHandshake(timeoutMs: number) {
  let state: HandshakeState = 'connecting'
  return {
    timeoutMs,
    state: () => state,
    onPlayerReady() {
      if (state === 'connecting') state = 'ready'
    },
    onTimeout() {
      if (state === 'connecting') state = 'failed'
    },
  }
}
