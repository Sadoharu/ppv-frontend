// src/pages/admin/EventEdit.tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getEvent, createEvent, updateEvent, type AdminEvent } from '@/api/adminEvents'
import EventForm from '@/components/events/EventForm'

const EMPTY: Partial<AdminEvent> = {
  title: '',
  slug: '',
  status: 'draft',
  starts_at: '',
  ends_at: '',
  thumbnail_url: '',
  short_description: '',
  player_manifest_url: '',
}

export default function EventEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'

  const [data, setData] = useState<Partial<AdminEvent>>(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let dead = false
    if (!isNew) {
      ;(async () => {
        try {
          setLoading(true)
          const r = await getEvent(Number(id))
          if (!dead) setData({ ...EMPTY, ...r })
        } finally {
          if (!dead) setLoading(false)
        }
      })()
    } else {
      setData(EMPTY)
    }
    return () => { dead = true }
  }, [id, isNew])

  if (loading) return <div className="p-4">Завантаження…</div>

  const isPublished = (data.status || '').toLowerCase() === 'published'
  const publicUrl = data.slug ? `/p/${encodeURIComponent(data.slug)}` : null

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{isNew ? 'Нова подія' : 'Редагування події'}</h1>

        {!isNew && (
          <div className="flex gap-2">
            <Link to={`/admin/events/${id}/page`} className="px-3 py-2 rounded border">
              Редактор сторінки
            </Link>
            <a
              href={publicUrl || '#'}
              target="_blank"
              rel="noopener"
              className={`px-3 py-2 rounded border ${publicUrl && isPublished ? '' : 'opacity-50 pointer-events-none'}`}
              title={isPublished ? 'Відкрити публічну сторінку' : 'Доступно після публікації'}
            >
              Перегляд
            </a>
          </div>
        )}
      </div>

      <EventForm
        initial={data}
        saving={saving}
        submitLabel={isNew ? 'Створити' : 'Зберегти'}
        onCancel={() => navigate('/admin/events')}
        onSubmit={async (payload) => {
          setSaving(true)
          try {
            if (isNew) {
              const created = await createEvent(payload)
              // одразу у редактор сторінки (HTML/CSS/JS)
              navigate(`/admin/events/${created.id}/page`)
            } else {
              await updateEvent(Number(id), payload)
              alert('Збережено')
            }
          } finally {
            setSaving(false)
          }
        }}
      />
    </div>
  )
}
