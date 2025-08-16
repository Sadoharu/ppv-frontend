import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getEvent, createEvent, updateEvent, type AdminEvent } from '@/api/adminEvents'
import EventForm from '@/components/events/EventForm'

const EMPTY: Partial<AdminEvent> = {
  title: '', slug: '', status: 'draft', starts_at: '', ends_at: '',
  thumbnail_url: '', short_description: '',
  player_manifest_url: '', custom_mode: 'none', custom_html: '', custom_css: '', custom_js: '',
}

export default function EventEdit(){
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'
  const [data, setData] = useState<Partial<AdminEvent>>(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isNew) {
      (async () => {
        try {
          setLoading(true)
          const r = await getEvent(Number(id))
          setData({ ...EMPTY, ...r })
        } finally {
          setLoading(false)
        }
      })()
    } else {
      setData(EMPTY)
    }
  }, [id, isNew])

  if (loading) return <div className="p-4">Завантаження…</div>

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">{isNew ? 'Нова подія' : 'Редагування події'}</h1>

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
              navigate(`/admin/events/${created.id}`)
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
