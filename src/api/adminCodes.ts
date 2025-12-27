// src/api/adminCodes.ts
import adminApi from './adminClient'

export async function listEventsForSelect() {
  const r = await adminApi.get('/api/admin/events', { params: { page: 1, page_size: 500 } })
  return (r.data?.items || []).map((e: any) => ({
    id: e.id,
    title: e.title,
    slug: e.slug,
  })) as Array<{ id: number; title: string; slug: string }>
}

export async function setCodeAllowedEvents(codeId: number, allowAll: boolean, eventIds: number[]) {
  await adminApi.post(`/api/admin/codes/${codeId}/allow_events`, {
    allow_all: allowAll,
    event_ids: allowAll ? [] : eventIds,
  })
}

/** Приклад створення кодів “bulk” (JSON). Поверни IDs створених кодів. */
export async function createCodesBulk(payload: any) {
  // твій існуючий endpoint: POST /admin/codes/bulk
  const r = await adminApi.post('/api/admin/codes/bulk', payload)
  return r.data // очікуємо { items: [{id: number, ...}, ...] } або масив
}
