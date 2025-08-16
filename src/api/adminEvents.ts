import adminApi from './adminClient'

export type AdminEvent = {
  id: number
  slug: string
  title: string
  status?: 'draft'|'published'|'archived'
  starts_at?: string | null
  ends_at?: string | null
  thumbnail_url?: string | null
  short_description?: string | null
  player_manifest_url?: string | null
  custom_mode?: 'none'|'safe'|'sandbox' | null
  custom_html?: string | null
  custom_css?: string | null
  custom_js?: string | null
  theme?: Record<string,string> | null
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
  const { data } = await adminApi.post('/api/admin/events', body)
  return data as AdminEvent
}

export async function updateEvent(id: number, body: Partial<AdminEvent>) {
  const { data } = await adminApi.patch(`/api/admin/events/${id}`, body)
  return data as AdminEvent
}

export async function deleteEvent(id: number) {
  await adminApi.delete(`/api/admin/events/${id}`)
}
