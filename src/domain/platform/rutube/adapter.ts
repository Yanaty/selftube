import type { PlatformAdapter, PlatformVideo, ResolvedLink } from '../types'
import { parseRutubeUrl, embedUrl, mapVideoResponse, mapChannelListItem } from './parse'

type FetchLike = (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>

const MAX_PAGES = 50

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
    if (!parsed) throw new Error('Ссылка не распознана как видео или канал Rutube')
    if (parsed.kind === 'video') {
      const raw = await this.getJson(`https://rutube.ru/api/video/${parsed.id}/`)
      return { kind: 'video', video: mapVideoResponse(raw) }
    }
    const firstPage = await this.getJson(`https://rutube.ru/api/video/person/${parsed.id}/?page=1`)
    const author = firstPage.results?.[0]?.author
    return {
      kind: 'channel',
      channel: {
        platform: 'RUTUBE',
        platformChannelId: parsed.id,
        title: String(author?.name ?? `Канал ${parsed.id}`),
        thumbnailUrl: String(author?.avatar_url ?? ''),
      },
    }
  }

  async listChannelVideos(platformChannelId: string): Promise<PlatformVideo[]> {
    const out: PlatformVideo[] = []
    for (let page = 1; page <= MAX_PAGES; page++) {
      const data = await this.getJson(`https://rutube.ru/api/video/person/${platformChannelId}/?page=${page}`)
      for (const item of data.results ?? []) out.push(mapChannelListItem(item))
      if (!data.has_next) break
    }
    return out
  }

  private async getJson(url: string): Promise<any> {
    const res = await this.fetchFn(url)
    if (!res.ok) throw new Error(`Rutube API ${res.status}: ${url}`)
    return res.json()
  }
}
