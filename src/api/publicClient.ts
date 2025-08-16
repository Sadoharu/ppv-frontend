import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE?.trim() || 'http://localhost:8000'

// Публічний клієнт (без cookies)
const pubApi = axios.create({
  baseURL,
  withCredentials: false,
  headers: {
    'Accept': 'application/json',
  }
})

export default pubApi

export type EventCard = {
  id: number
  slug: string
  title: string
  starts_at?: string | null
  ends_at?: string | null
  thumbnail_url?: string | null
  short_description?: string | null
}

export type EventPublic = {
  id: number
  slug: string
  title: string
  player_manifest_url?: string | null
  custom_mode?: 'none' | 'safe' | 'sandbox' | null
  theme?: Record<string, string> | null
}

export async function fetchPublishedEvents(): Promise<EventCard[]> {
  const r = await pubApi.get('/api/events', { params: { status: 'published' } })
  return r.data
}

export async function fetchEventPublic(slug: string): Promise<EventPublic> {
  const r = await pubApi.get(`/api/events/${encodeURIComponent(slug)}/public`)
  return r.data
}
