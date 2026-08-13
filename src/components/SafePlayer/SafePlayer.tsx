'use client'
import { useEffect, useRef, useState } from 'react'
import { createHandshake } from './handshake'

/**
 * SafePlayer — изолированный Rutube-плеер для детей (fail-closed).
 *
 * REAL Rutube postMessage API (verified 2026-08-13), sources:
 *   - https://github.com/evikza/Rutube-Player-JS-API-Doc  (community doc)
 *   - https://github.com/evikza/rutube-player  (JS wrapper)
 *   - https://github.com/bilouw/vue-rutube  (Vue wrapper, raw postMessage)
 *   - https://rutube.ru/info/embed/  (official embed FAQ)
 *
 * Envelope: window.postMessage(JSON.stringify({ type: 'player:<name>', data: {} }), '*')
 * Events FROM the player (message.data is a JSON string):
 *   - 'player:ready'        — player loaded & ready (fired once). We use it as the handshake signal.
 *   - 'player:changeState'  — playback state changed. data.state === 'playing' | 'pause'.
 *                             (NOTE: the paused value is the literal string "pause", NOT "paused".)
 *   - 'player:playComplete' — video (and ads) finished. Drives onEnded().
 *   - 'player:currentTime'  — periodic time update. data.time is seconds (float). Used for rewind seek.
 * Commands TO the player:
 *   - 'player:play'            data: {}
 *   - 'player:pause'           data: {}
 *   - 'player:mute'            data: {}
 *   - 'player:setCurrentTime'  data: { time: <seconds> }   (absolute seek)
 *
 * Ready-signal choice: Rutube DOES emit a distinct 'player:ready', so we wire onPlayerReady to it.
 * As a defensive fallback we also treat 'player:changeState' as readiness — some player builds
 * begin emitting state changes and may miss/precede 'player:ready'; either proves the player is
 * alive and answering, which is exactly what the fail-closed handshake needs.
 */

type Props = {
  embedUrl: string
  onEnded: () => void
  onTick?: (seconds: number) => void
}

export function SafePlayer({ embedUrl, onEnded, onTick }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [handshake] = useState(() => createHandshake(4000))
  const [, force] = useState(0)
  const [playing, setPlaying] = useState(false)
  const currentTimeRef = useRef(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      handshake.onTimeout()
      force((n) => n + 1)
    }, handshake.timeoutMs)

    function onMessage(e: MessageEvent) {
      if (!isRutubeOrigin(e.origin)) return
      const data = typeof e.data === 'string' ? safeParse(e.data) : e.data
      if (!data || typeof data.type !== 'string') return

      // Readiness: primary signal is player:ready; changeState is a defensive fallback.
      if (data.type === 'player:ready' || data.type === 'player:changeState') {
        handshake.onPlayerReady()
        force((n) => n + 1)
      }
      if (data.type === 'player:playComplete') onEnded()
      if (data.type === 'player:changeState') {
        if (data.data?.state === 'playing') setPlaying(true)
        if (data.data?.state === 'pause') setPlaying(false)
      }
      if (data.type === 'player:currentTime' && typeof data.data?.time === 'number') {
        currentTimeRef.current = data.data.time
      }
    }

    window.addEventListener('message', onMessage)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('message', onMessage)
    }
  }, [handshake, onEnded])

  useEffect(() => {
    if (!onTick) return
    const id = setInterval(() => {
      if (playing) onTick(5)
    }, 5000)
    return () => clearInterval(id)
  }, [playing, onTick])

  function send(method: string, payload: Record<string, unknown> = {}) {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ type: `player:${method}`, data: payload }),
      '*',
    )
  }

  function togglePlay() {
    playing ? send('pause') : send('play')
  }

  function rewind10() {
    const target = Math.max(0, currentTimeRef.current - 10)
    send('setCurrentTime', { time: target })
  }

  if (handshake.state() === 'failed') {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center rounded-2xl bg-amber-100 font-bold text-amber-900">
        Видео временно недоступно
      </div>
    )
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: '16 / 9' }}>
      <iframe
        ref={iframeRef}
        src={`${embedUrl}${embedUrl.includes('?') ? '&' : '?'}`}
        className="absolute inset-0 h-full w-full"
        sandbox="allow-scripts allow-same-origin"
        allow="fullscreen; encrypted-media"
        referrerPolicy="strict-origin-when-cross-origin"
      />
      {/* Transparent overlay intercepts ALL taps on the player: Rutube logo, "related",
          and links stay unreachable. Only our controls drive the player. */}
      <div className="absolute inset-0" onClick={togglePlay} />
      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-4 bg-gradient-to-t from-black/70 to-transparent p-3 text-2xl text-white">
        <button onClick={rewind10} aria-label="Назад 10с">⏪</button>
        <button onClick={togglePlay} aria-label="Пауза/играть">{playing ? '⏸' : '▶️'}</button>
        <button onClick={() => send('mute')} className="ml-auto" aria-label="Звук">🔊</button>
      </div>
    </div>
  )
}

function isRutubeOrigin(origin: string): boolean {
  try {
    return /(^|\.)rutube\.ru$/.test(new URL(origin).hostname)
  } catch {
    return false
  }
}

function safeParse(s: string): any {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}
