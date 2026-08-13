export type Platform = 'RUTUBE'

export type PlatformVideo = {
  platform: Platform
  platformVideoId: string
  title: string
  thumbnailUrl: string
  durationSec: number
  embedUrl: string
  publishedAt: Date | null
}

export type PlatformChannel = {
  platform: Platform
  platformChannelId: string
  title: string
  thumbnailUrl: string
}

export type ResolvedLink =
  | { kind: 'video'; video: PlatformVideo }
  | { kind: 'channel'; channel: PlatformChannel }

export interface PlatformAdapter {
  readonly platform: Platform
  matches(url: string): boolean
  resolve(url: string): Promise<ResolvedLink>
  listChannelVideos(platformChannelId: string): Promise<PlatformVideo[]>
  getEmbedUrl(platformVideoId: string): string
}
