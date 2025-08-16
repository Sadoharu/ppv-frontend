import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listEvents, deleteEvent, type AdminEvent } from '@/api/adminEvents'

export default function EventsList() {
  const [items, setItems] = useState<AdminEvent[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  async function load() {
    setLoading(true)
    try {
      const r = await listEvents({ q, page: 1, page_size: 50 })
      setItems(r.items || [])
      setTotal(r.total || 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Події</h1>

        {/* тепер відкриваємо СТОРІНКУ створення */}
        <Link
          to="/admin/events/new"
          className="px-3 py-2 rounded bg-slate-900 text-white"
        >
          Створити подію
        </Link>
      </div>

      <div className="flex gap-2">
        <input
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder="Пошук"
          className="border rounded px-3 py-2"
        />
        <button onClick={load} className="px-3 py-2 border rounded">Шукати</button>
      </div>

      {loading ? <div>Завантаження…</div> : (
        <div className="overflow-x-auto">
          <table className="min-w-full border divide-y">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-2">ID</th>
                <th className="text-left p-2">Назва</th>
                <th className="text-left p-2">Slug</th>
                <th className="text-left p-2">Статус</th>
                <th className="text-left p-2">Період</th>
                <th className="text-left p-2">Дії</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id} className="border-b">
                  <td className="p-2">{it.id}</td>
                  <td className="p-2">
                    <Link to={`/admin/events/${it.id}`} className="text-blue-600 hover:underline">
                      {it.title}
                    </Link>
                  </td>
                  <td className="p-2">{it.slug}</td>
                  <td className="p-2">{it.status || '—'}</td>
                  <td className="p-2">
                    {it.starts_at ? new Date(it.starts_at).toLocaleString() : '—'}
                    &nbsp;–&nbsp;
                    {it.ends_at ? new Date(it.ends_at).toLocaleString() : '—'}
                  </td>
                  <td className="p-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Link to={`/admin/events/${it.id}`} className="px-2 py-1 rounded border text-center">
                        Редагувати
                      </Link>
                      <button
                        className="px-2 py-1 rounded border text-red-600"
                        onClick={async()=>{
                          if (!confirm('Видалити подію?')) return
                          await deleteEvent(it.id); await load()
                        }}
                      >
                        Видалити
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td className="p-4 text-sm text-slate-500" colSpan={6}>Немає подій</td></tr>
              )}
            </tbody>
          </table>
          <div className="text-sm text-slate-500 mt-2">Всього: {total}</div>
        </div>
      )}
    </div>
  )
}
