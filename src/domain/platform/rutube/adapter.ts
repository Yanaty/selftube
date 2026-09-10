import type { PlatformAdapter, PlatformVideo, ResolvedLink, SourceKind } from '../types'
import { parseRutubeUrl, embedUrl, mapVideoResponse, mapChannelListItem } from './parse'

type FetchInit = { headers: Record<string, string> }
type FetchLike = (
  url: string,
  init?: FetchInit,
) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>

const MAX_PAGES = 50

// Без браузерного UA Rutube периодически отвечает 403 даже на публичные эндпоинты
// (проверено: 3 запроса подряд без UA — 403/403/200, с UA — все 200).
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'

export class RutubeAdapter implements PlatformAdapter {
  readonly platform = 'RUTUBE' as const
  constructor(private readonly fetchFn: FetchLike = fetch as any) {}

  matches(url: string): boolean {
    return parseRutubeUrl(url) !== null
  }

  getEmbedUrl(platformVideoId: string): string {
    return embedUrl(platformVideoId)
  }

  async resolve(url: string): Promise<ResolvedLink> {
    const parsed = parseRutubeUrl(url)
    if (!parsed) throw new Error('Ссылка не распознана как видео, канал или плейлист Rutube')

    if (parsed.kind === 'video') {
      const raw = await this.getJson(`https://rutube.ru/api/video/${parsed.id}/`)
      return { kind: 'video', video: mapVideoResponse(raw) }
    }

    if (parsed.kind === 'playlist') {
      const raw = await this.getJson(playlistMetaUrl(parsed.id))
      return {
        kind: 'source',
        source: {
          platform: 'RUTUBE',
          kind: 'PLAYLIST',
          platformSourceId: parsed.id,
          title: String(raw.title ?? `Плейлист ${parsed.id}`),
          thumbnailUrl: String(raw.thumbnail_url ?? ''),
        },
      }
    }

    // У канала отдельного «паспорта» в публичном API нет — имя и аватар берём из
    // первой страницы его видео.
    const firstPage = await this.getJson(sourcePageUrl('CHANNEL', parsed.id, 1))
    const author = firstPage.results?.[0]?.author
    return {
      kind: 'source',
      source: {
        platform: 'RUTUBE',
        kind: 'CHANNEL',
        platformSourceId: parsed.id,
        title: String(author?.name ?? `Канал ${parsed.id}`),
        thumbnailUrl: String(author?.avatar_url ?? ''),
      },
    }
  }

  async listSourceVideos(kind: SourceKind, platformSourceId: string): Promise<PlatformVideo[]> {
    const out: PlatformVideo[] = []
    for (let page = 1; page <= MAX_PAGES; page++) {
      const data = await this.getJson(sourcePageUrl(kind, platformSourceId, page))
      for (const item of data.results ?? []) out.push(mapChannelListItem(item))
      if (!data.has_next) break
    }
    return out
  }

  private async getJson(url: string): Promise<any> {
    const res = await this.fetchFn(url, { headers: { 'User-Agent': BROWSER_UA } })
    if (!res.ok) throw new Error(`Rutube API ${res.status}: ${url}`)
    return res.json()
  }
}

// Обе ленты пагинируются одинаково (has_next), различаются только адресом.
function sourcePageUrl(kind: SourceKind, id: string, page: number): string {
  return kind === 'PLAYLIST'
    ? `https://rutube.ru/api/playlist/custom/${id}/videos/?client=wdp&page=${page}`
    : `https://rutube.ru/api/video/person/${id}/?page=${page}`
}

function playlistMetaUrl(id: string): string {
  return `https://rutube.ru/api/playlist/custom/${id}/?client=wdp`
}
