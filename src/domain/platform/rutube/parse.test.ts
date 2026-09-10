import { describe, it, expect } from 'vitest'
import {
  parseRutubeUrl, embedUrl, mapVideoResponse, mapChannelListItem,
} from './parse'

describe('parseRutubeUrl', () => {
  it('распознаёт видео', () => {
    expect(parseRutubeUrl('https://rutube.ru/video/abc123def/'))
      .toEqual({ kind: 'video', id: 'abc123def' })
  })
  it('распознаёт embed-видео', () => {
    expect(parseRutubeUrl('https://rutube.ru/play/embed/abc123def'))
      .toEqual({ kind: 'video', id: 'abc123def' })
  })
  it('распознаёт канал', () => {
    expect(parseRutubeUrl('https://rutube.ru/channel/23704195/'))
      .toEqual({ kind: 'channel', id: '23704195' })
  })
  it('дополняет схему, если ссылку скопировали без https://', () => {
    expect(parseRutubeUrl('rutube.ru/channel/23593353/'))
      .toEqual({ kind: 'channel', id: '23593353' })
    expect(parseRutubeUrl('www.rutube.ru/video/abc123def/'))
      .toEqual({ kind: 'video', id: 'abc123def' })
  })
  it('возвращает null для чужого/битого URL', () => {
    expect(parseRutubeUrl('https://youtube.com/watch?v=x')).toBeNull()
    expect(parseRutubeUrl('youtube.com/watch?v=x')).toBeNull()
    expect(parseRutubeUrl('not a url')).toBeNull()
    expect(parseRutubeUrl('   ')).toBeNull()
  })
})

describe('embedUrl', () => {
  it('строит embed-URL', () => {
    expect(embedUrl('abc')).toBe('https://rutube.ru/play/embed/abc')
  })
})

describe('mapVideoResponse', () => {
  it('маппит ответ api/video/{id}/ во внутреннюю модель', () => {
    const raw = {
      id: 'abc', title: 'Синий трактор', duration: 493,
      thumbnail_url: 'https://pic.rtbcdn.ru/x.jpg',
      publication_ts: '2024-01-02T00:00:00', author: { id: 111 },
    }
    expect(mapVideoResponse(raw)).toEqual({
      platform: 'RUTUBE', platformVideoId: 'abc', title: 'Синий трактор',
      thumbnailUrl: 'https://pic.rtbcdn.ru/x.jpg', durationSec: 493,
      embedUrl: 'https://rutube.ru/play/embed/abc',
      publishedAt: new Date('2024-01-02T00:00:00'),
    })
  })
  it('терпит отсутствие даты', () => {
    const raw = { id: 'abc', title: 'X', duration: 10, thumbnail_url: 't' }
    expect(mapVideoResponse(raw).publishedAt).toBeNull()
  })
})

describe('mapChannelListItem', () => {
  it('маппит элемент списка видео канала', () => {
    const raw = { id: 'v1', title: 'V', duration: 60, thumbnail_url: 't' }
    expect(mapChannelListItem(raw)).toMatchObject({
      platformVideoId: 'v1', durationSec: 60,
      embedUrl: 'https://rutube.ru/play/embed/v1',
    })
  })
})
