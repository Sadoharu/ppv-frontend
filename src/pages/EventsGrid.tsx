// src/pages/EventsGrid.tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPublishedEvents, type EventCard } from '@/api/publicClient'

export default function EventsGrid(){
  const [items, setItems] = useState<EventCard[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let dead = false
    ;(async () => {
      try {
        const data = await fetchPublishedEvents()
        if (!dead) setItems(data || [])
      } catch (e:any) {
        if (!dead) setErr(e?.message || 'Помилка завантаження')
      } finally {
        if (!dead) setLoading(false)
      }
    })()
    return () => { dead = true }
  }, [])

  if (loading) return <div className="min-h-screen grid place-items-center">Завантаження…</div>
  if (err) return <div className="min-h-screen grid place-items-center text-red-600">{err}</div>

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-bold mb-4">Події</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(ev => (
          <Link key={ev.id} to={`/events/${ev.slug}`} className="border rounded-xl overflow-hidden hover:shadow-lg transition bg-white">
            <div className="aspect-video bg-gray-100">
              {ev.thumbnail_url && <img src={ev.thumbnail_url} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="p-4">
              <div className="font-semibold">{ev.title}</div>
              {ev.starts_at && <div className="text-sm text-gray-500">{new Date(ev.starts_at).toLocaleString()}</div>}
              {ev.short_description && <div className="text-sm mt-1 line-clamp-2">{ev.short_description}</div>}
            </div>
          </Link>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-gray-500">Немає опублікованих подій</div>
        )}
      </div>
    </div>
  )
}
