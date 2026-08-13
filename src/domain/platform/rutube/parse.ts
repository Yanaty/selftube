import type { PlatformVideo } from '../types'

export type ParsedRutube = { kind: 'video' | 'channel'; id: string } | null

export function parseRutubeUrl(input: string): ParsedRutube {
  let url: URL
  try { url = new URL(input) } catch { return null }
  if (!/(^|\.)rutube\.ru$/.test(url.hostname)) return null
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts[0] === 'video' && parts[1]) return { kind: 'video', id: parts[1] }
  if (parts[0] === 'play' && parts[1] === 'embed' && parts[2]) return { kind: 'video', id: parts[2] }
  if (parts[0] === 'channel' && parts[1]) return { kind: 'channel', id: parts[1] }
  return null
}

export function embedUrl(videoId: string): string {
  return `https://rutube.ru/play/embed/${videoId}`
}

function toDate(v: unknown): Date | null {
  if (typeof v !== 'string' || v.length === 0) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

export function mapVideoResponse(raw: any): PlatformVideo {
  return {
    platform: 'RUTUBE',
    platformVideoId: String(raw.id),
    title: String(raw.title ?? ''),
    thumbnailUrl: String(raw.thumbnail_url ?? ''),
    durationSec: Number(raw.duration ?? 0),
    embedUrl: embedUrl(String(raw.id)),
    publishedAt: toDate(raw.publication_ts),
  }
}

export function mapChannelListItem(raw: any): PlatformVideo {
  return mapVideoResponse(raw)
}
