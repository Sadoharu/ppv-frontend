//done
import { useEffect, useState } from 'react'
import api from '@/api/adminClient'
import type { EventItem } from '@/types/codes'

export function useEvents() {
  const [events, setEvents] = useState<EventItem[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await api.get('/api/admin/events', { params: { page: 1, page_size: 500 } })
        const raw = r.data
        const arr = Array.isArray(raw) ? raw : (raw?.items || [])
        if (!cancelled) setEvents(arr.map((e: any) => ({ id: e.id, title: e.title, slug: e.slug })))
      } catch {
        if (!cancelled) setEvents([])
      }
    })()
    return () => { cancelled = true }
  }, [])

  return events
}