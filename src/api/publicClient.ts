// src/api/publicClient.ts
import axios from 'axios'

const baseURL = (import.meta.env.VITE_API_BASE?.trim() || 'http://localhost:8000')

// Публічний клієнт (без cookies)
const pubApi = axios.create({
  baseURL,
  withCredentials: false,
  headers: {
    Accept: 'application/json',
  },
})

export default pubApi

// Картка публічної події (і в списку, і в деталях)
export type EventCard = {
  id: number
  slug: string
  title: string
  starts_at?: string | null
  ends_at?: string | null
  thumbnail_url?: string | null
  short_description?: string | null
  page_url?: string | null // <-- головне: куди відкривати HTML сторінку
}

// Параметри фільтрації каталогу (опц.)
export type FetchEventsParams = {
  status?: 'published' | 'scheduled' | 'live' | 'ended' // бек дозволяє status=...
  q?: string
  limit?: number
  offset?: number
}

/**
 * Отримати список подій (за замовчуванням лише published).
 * Використовуй ev.page_url, щоб відкривати HTML сторінку бекенду.
 */
export async function fetchPublishedEvents(params: FetchEventsParams = { status: 'published' }): Promise<EventCard[]> {
  const r = await pubApi.get('/api/events', { params: { status: params.status ?? 'published', q: params.q, limit: params.limit, offset: params.offset } })
  return r.data
}

/**
 * Варіант зі підтримкою ETag (для умовного GET і економії трафіку).
 * Якщо notModified=true — можна лишити попередні дані.
 */
export async function fetchPublishedEventsCached(
  etag?: string,
  params: FetchEventsParams = { status: 'published' },
): Promise<{ data: EventCard[] | null; etag: string | null; notModified: boolean }> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (etag) headers['If-None-Match'] = etag
  const { data, headers: h, status } = await pubApi.get('/api/events', {
    params: { status: params.status ?? 'published', q: params.q, limit: params.limit, offset: params.offset },
    headers,
    validateStatus: () => true,
  })
  if (status === 304) {
    return { data: null, etag: etag ?? null, notModified: true }
  }
  return { data, etag: h.etag || null, notModified: false }
}

/**
 * Отримати картку конкретної події для каталогу/деталей.
 * Важливо: перегляд сторінки робимо через card.page_url або /p/{slug}.
 */
export async function fetchEventCard(slug: string): Promise<EventCard> {
  const r = await pubApi.get(`/api/events/${encodeURIComponent(slug)}`)
  return r.data
}
