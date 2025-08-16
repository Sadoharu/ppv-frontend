//done
import { useEffect, useState } from 'react'
import { patchCode } from '@/api/admin'
import api from '@/api/adminClient'
import DualList from '@/components/DualList'
import type { EventItem } from '@/types/codes'

type Props = {
  id: number | null
  onClose: () => void
  onSaved: () => Promise<void> | void
  events: EventItem[]
  preload?: { allowAll: boolean; eventIds: number[] } | null
}

export default function EditCodeModal({ id, onClose, onSaved, events, preload }: Props) {
  const open = id !== null
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [expUnlimited, setExpUnlimited] = useState(true)
  const [expLocal, setExpLocal] = useState('')

  const [allowAll, setAllowAll] = useState(false)
  const [eventIds, setEventIds] = useState<number[]>([])

  useEffect(() => {
    if (!open) return
    setError(null)
    setLoading(true)
    ;(async () => {
      try {
        // Якщо прийшов preload з таблиці — використовуємо його
        if (preload) {
          setAllowAll(preload.allowAll)
          setEventIds(preload.eventIds)
        } else if (id) {
          const r = await api.get(`/api/admin/codes/${id}`)
          setAllowAll(Boolean(r.data?.allow_all_events))
          setEventIds((r.data?.allowed_event_ids || []) as number[])
        }
      } catch (e:any) {
        setError(e?.response?.data?.detail || 'Не вдалося завантажити налаштування доступу')
      } finally {
        setLoading(false)
      }
    })()
  }, [open, id])

  if (!open || id === null) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
      <div className="bg-white rounded-xl shadow p-6 w-[740px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Налаштування коду #{id}</h2>
          <button onClick={onClose} className="text-slate-500">✕</button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (saving) return
            setSaving(true)
            setError(null)
            try {
              const payload: any = {}
              if (expUnlimited) payload.expires_at = null
              else if (expLocal) payload.expires_at = new Date(expLocal).toISOString()
              if (Object.keys(payload).length) await patchCode(id, payload)

              // зберігаємо доступи
              await api.post(`/api/admin/codes/${id}/allow_events`, { allow_all: allowAll, event_ids: allowAll ? [] : eventIds }, { validateStatus: s => s >= 200 && s < 300 })

              onClose()
              await onSaved()
            } catch (e:any) {
              setError(e?.response?.data?.detail || 'Не вдалося зберегти')
            } finally {
              setSaving(false)
            }
          }}
          className="space-y-5"
        >
          {loading ? (
            <div>Завантаження…</div>
          ) : (
            <>
              <div>
                <label className="block text-sm mb-1">Дійсний до</label>
                <input type="datetime-local" value={expUnlimited ? '' : expLocal} onChange={e => { setExpLocal(e.target.value); setExpUnlimited(false) }} className="border rounded px-3 py-2 w-full" disabled={expUnlimited} />
                <label className="inline-flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={expUnlimited} onChange={e => { setExpUnlimited(e.target.checked); if (e.target.checked) setExpLocal('') }} />
                  <span>Необмежений</span>
                </label>
              </div>

              <div className="mt-5">
                <label className="block text-sm mb-1">Доступ до подій</label>
                <label className="inline-flex items-center gap-2 mb-2">
                  <input type="checkbox" checked={allowAll} onChange={e => setAllowAll(e.target.checked)} />
                  <span>Безліміт на всі події</span>
                </label>
                <DualList
                  leftTitle="Доступні"
                  rightTitle="Дозволені"
                  left={events.filter(e => !eventIds.includes(e.id)).map(e => ({ id: e.id, label: `${e.title} (${e.slug})` }))}
                  right={events.filter(e => eventIds.includes(e.id)).map(e => ({ id: e.id, label: `${e.title} (${e.slug})` }))}
                  onChange={setEventIds}
                  disabled={allowAll}
                />
                <div className="text-xs text-slate-500 mt-1">Подвійний клік переносить елемент між списками або виділяйте чекбоксами і тисніть стрілки.</div>
              </div>
            </>
          )}

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="border rounded px-4 py-2">Скасувати</button>
            <button type="submit" className="bg-slate-900 text-white rounded px-4 py-2" disabled={saving}>{saving ? 'Збереження…' : 'Зберегти'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}