export type Platform = 'RUTUBE'

/** Вид источника: канал целиком или отдельный плейлист. */
export type SourceKind = 'CHANNEL' | 'PLAYLIST'

export type PlatformVideo = {
  platform: Platform
  platformVideoId: string
  title: string
  thumbnailUrl: string
  durationSec: number
  embedUrl: string
  publishedAt: Date | null
}

export type PlatformSource = {
  platform: Platform
  kind: SourceKind
  platformSourceId: string
  title: string
  thumbnailUrl: string
}

export type ResolvedLink =
  | { kind: 'video'; video: PlatformVideo }
  | { kind: 'source'; source: PlatformSource }

export interface PlatformAdapter {
  readonly platform: Platform
  matches(url: string): boolean
  resolve(url: string): Promise<ResolvedLink>
  listSourceVideos(kind: SourceKind, platformSourceId: string): Promise<PlatformVideo[]>
  getEmbedUrl(platformVideoId: string): string
}
