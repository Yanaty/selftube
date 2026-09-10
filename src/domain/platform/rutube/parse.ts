import type { PlatformVideo } from '../types'

export type ParsedRutube = { kind: 'video' | 'channel' | 'playlist'; id: string } | null

// Родители копируют ссылку по-разному: из адресной строки (со схемой) или руками
// («rutube.ru/channel/123»). Второй вариант браузер дополняет сам, дополним и мы.
function toUrl(input: string): URL | null {
  const raw = input.trim()
  if (raw.length === 0) return null
  try { return new URL(raw) } catch {}
  try { return new URL(`https://${raw}`) } catch { return null }
}

export function parseRutubeUrl(input: string): ParsedRutube {
  const url = toUrl(input)
  if (!url) return null
  if (!/(^|\.)rutube\.ru$/.test(url.hostname)) return null
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts[0] === 'video' && parts[1]) return { kind: 'video', id: parts[1] }
  if (parts[0] === 'play' && parts[1] === 'embed' && parts[2]) return { kind: 'video', id: parts[2] }
  if (parts[0] === 'channel' && parts[1]) return { kind: 'channel', id: parts[1] }
  if (parts[0] === 'plst' && parts[1]) return { kind: 'playlist', id: parts[1] }
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
