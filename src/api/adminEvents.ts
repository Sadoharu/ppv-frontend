// src/api/adminEvents.ts
import adminApi from './adminClient'

export type AdminEventStatus =
  | 'draft' | 'scheduled' | 'published' | 'live' | 'ended' | 'archived'

export type AdminEvent = {
  id: number
  slug: string
  title: string
  status?: AdminEventStatus
  starts_at?: string | null
  ends_at?: string | null
  thumbnail_url?: string | null
  short_description?: string | null
  player_manifest_url?: string | null
  page_url?: string | null // опціонально: бек може повертати готову URL сторінки /p/{slug}
}

export type EventPayload = {
  title: string
  slug: string
  status: AdminEventStatus
  starts_at?: string
  ends_at?: string
  thumbnail_url?: string
  short_description?: string
  player_manifest_url?: string
}

function toIso(v?: string | null) {
  return v ? new Date(v).toISOString() : undefined
}

function buildPayload(form: Partial<AdminEvent>): EventPayload {
  return {
    title: (form.title || '').trim(),
    slug: (form.slug || '').trim(),
    status: (form.status as AdminEventStatus) || 'draft',
    starts_at: toIso(form.starts_at),
    ends_at: toIso(form.ends_at),
    thumbnail_url: form.thumbnail_url || undefined,
    short_description: form.short_description || undefined,
    player_manifest_url: form.player_manifest_url || undefined,
  }
}

export async function listEvents(params: { q?: string; status?: string; page?: number; page_size?: number } = {}) {
  const { data } = await adminApi.get('/api/admin/events', { params })
  return data as { total: number; items: AdminEvent[] }
}

export async function getEvent(id: number) {
  const { data } = await adminApi.get(`/api/admin/events/${id}`)
  return data as AdminEvent
}

export async function createEvent(body: Partial<AdminEvent>) {
  const payload = buildPayload(body)
  const { data } = await adminApi.post('/api/admin/events', payload, { validateStatus: s => s >= 200 && s < 300 })
  return data as AdminEvent
}

export async function updateEvent(id: number, body: Partial<AdminEvent>) {
  const payload = buildPayload(body)
  const { data } = await adminApi.patch(`/api/admin/events/${id}`, payload, { validateStatus: s => s >= 200 && s < 300 })
  return data as AdminEvent
}

export async function deleteEvent(id: number) {
  await adminApi.delete(`/api/admin/events/${id}`, { validateStatus: s => s >= 200 && s < 300 })
}
