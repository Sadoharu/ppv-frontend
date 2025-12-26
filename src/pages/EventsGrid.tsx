// src/pages/EventsGrid.tsx
import { useEffect, useState } from 'react'
import { fetchPublishedEventsCached, type EventCard } from '@/api/publicClient'

export default function EventsGrid() {
  const [items, setItems] = useState<EventCard[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [etag, setEtag] = useState<string | null>(null)

  useEffect(() => {
    let dead = false
    ;(async () => {
      try {
        const { data, etag: newEtag, notModified } = await fetchPublishedEventsCached(etag, { status: 'published' })
        if (dead) return
        if (!notModified && data) {
          setItems(data)
          setEtag(newEtag)
        }
      } catch (e: any) {
        if (!dead) setErr(e?.message || 'Помилка завантаження')
      } finally {
        if (!dead) setLoading(false)
      }
    })()
    return () => { dead = true }
  }, []) // початкове завантаження

  if (loading) return <div className="min-h-screen grid place-items-center">Завантаження…</div>
  if (err) return <div className="min-h-screen grid place-items-center text-red-600">{err}</div>

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-bold mb-4">Події</h1>

      {items.length === 0 ? (
        <div className="text-sm text-gray-500">Немає опублікованих подій</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(ev => {
            const url = ev.page_url || `/p/${encodeURIComponent(ev.slug)}`
            return (
              <a
                key={ev.id}
                href={url}
                className="border rounded-xl overflow-hidden hover:shadow-lg transition bg-white block"
                rel="noopener"
              >
                <div className="aspect-video bg-gray-100">
                  {ev.thumbnail_url ? (
                    <img
                      src={ev.thumbnail_url}
                      alt={ev.title || 'Подія'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div className="p-4">
                  <div className="font-semibold">{ev.title}</div>
                  {ev.starts_at && (
                    <div className="text-sm text-gray-500">
                      {new Date(ev.starts_at).toLocaleString('uk-UA')}
                    </div>
                  )}
                  {ev.short_description && (
                    <div className="text-sm mt-1 line-clamp-2">{ev.short_description}</div>
                  )}
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
