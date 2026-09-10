'use client'
import { useEffect, useRef, useState } from 'react'
import { createHandshake } from './handshake'
import { formatTime, clampTime } from './time'

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
 *   - 'player:currentTime'  — periodic time update. data: { time, currentTime, duration } (seconds, float).
 *   - 'player:durationChange' — data: { duration } (seconds). Length becomes known here.
 *   - 'player:volumeChange'   — data: { volume } in 0..1. volume === 0 means muted.
 * Commands TO the player:
 *   - 'player:play'            data: {}
 *   - 'player:pause'           data: {}
 *   - 'player:mute'            data: {}   — one-way: it only SILENCES the player.
 *   - 'player:unMute'          data: {}   — the counterpart that brings the sound back.
 *   - 'player:setCurrentTime'  data: { time: <seconds> }   (absolute seek)
 *   - 'player:hideControls'    data: {}   — hides Rutube's own UI, so the child only ever
 *                                          sees OUR controls under the click-blocking overlay.
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
  /** Длительность из каталога — запасной вариант, пока плеер не прислал свою. */
  durationSec?: number
}

export function SafePlayer({ embedUrl, onEnded, onTick, durationSec = 0 }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [handshake] = useState(() => createHandshake(4000))
  const [, force] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [duration, setDuration] = useState(durationSec)
  const [position, setPosition] = useState(0)
  // Пока ребёнок тащит ползунок, показываем его палец, а не приходящие тики плеера.
  const [scrub, setScrub] = useState<number | null>(null)

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
        // Родной UI Rutube всё равно недоступен из-за оверлея — прячем его, чтобы
        // ребёнок не тыкал в мёртвую полосу перемотки вместо нашей.
        send('hideControls')
      }
      if (data.type === 'player:playComplete') onEnded()
      if (data.type === 'player:changeState') {
        if (data.data?.state === 'playing') setPlaying(true)
        if (data.data?.state === 'pause') setPlaying(false)
      }
      if (data.type === 'player:currentTime' && typeof data.data?.time === 'number') {
        setPosition(data.data.time)
        if (typeof data.data.duration === 'number' && data.data.duration > 0) {
          setDuration(data.data.duration)
        }
      }
      if (data.type === 'player:durationChange' && typeof data.data?.duration === 'number') {
        setDuration(data.data.duration)
      }
      // Громкость может смениться и без нас (автоплей без звука) — держим кнопку честной.
      if (data.type === 'player:volumeChange' && typeof data.data?.volume === 'number') {
        setMuted(data.data.volume === 0)
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

  function toggleMute() {
    // player:mute только выключает звук; включает обратно отдельная команда player:unMute.
    send(muted ? 'unMute' : 'mute')
    setMuted(!muted)
  }

  function seekTo(time: number) {
    const target = clampTime(time, duration)
    send('setCurrentTime', { time: target })
    setPosition(target)
  }

  function rewind10() {
    seekTo((scrub ?? position) - 10)
  }

  function commitScrub() {
    if (scrub === null) return
    seekTo(scrub)
    setScrub(null)
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
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white">
        <div className="flex items-center gap-2">
          <span className="w-10 text-xs tabular-nums">{formatTime(scrub ?? position)}</span>
          <input
            type="range"
            aria-label="Перемотка"
            min={0}
            max={duration}
            step={1}
            disabled={duration <= 0}
            value={scrub ?? position}
            onChange={(e) => setScrub(Number(e.target.value))}
            onPointerUp={commitScrub}
            onMouseUp={commitScrub}
            onTouchEnd={commitScrub}
            onKeyUp={commitScrub}
            className="h-6 flex-1 accent-orange-500 disabled:opacity-40"
          />
          <span className="w-10 text-xs tabular-nums">{formatTime(duration)}</span>
        </div>
        <div className="mt-1 flex items-center gap-4 text-2xl">
          <button onClick={rewind10} aria-label="Назад 10с">⏪</button>
          <button onClick={togglePlay} aria-label="Пауза/играть">{playing ? '⏸' : '▶️'}</button>
          <button
            onClick={toggleMute}
            className="ml-auto"
            aria-label={muted ? 'Включить звук' : 'Выключить звук'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
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
