//done
import { useState } from 'react'
import api from '@/api/adminClient'
import DualList from '@/components/DualList'
import type { EventItem } from '@/types/codes'

type Props = {
  open: boolean
  onClose: () => void
  onCreated: () => Promise<void> | void
  events: EventItem[]
}

export default function CreateCodesModal({ open, onClose, onCreated, events }: Props) {
  const [amount, setAmount] = useState<number>(10)
  const [sessions, setSessions] = useState<number>(1)
  const [batchLabel, setBatchLabel] = useState('')
  const [expUnlimited, setExpUnlimited] = useState(true)
  const [expLocal, setExpLocal] = useState('')

  const [createAllowAll, setCreateAllowAll] = useState(false)
  const [createEventIds, setCreateEventIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
      <div className="bg-white rounded-xl shadow p-6 w-[740px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Створити коди</h2>
          <button onClick={onClose} className="text-slate-500">✕</button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (saving) return
            setSaving(true)
            setError(null)
            try {
              const payload: any = {
                amount,
                max_concurrent_sessions: sessions,
                event: batchLabel?.trim() || undefined,
                allow_all: createAllowAll,
                event_ids: createAllowAll ? [] : createEventIds,
              }
              if (!expUnlimited && expLocal) payload.expires_at = new Date(expLocal).toISOString()

              const r = await api.post('/api/admin/codes/bulk', payload, { validateStatus: s => s >= 200 && s < 300 })
              const idsFromNewApi: number[] = Array.isArray(r.data?.ids) ? r.data.ids : []
              if (!idsFromNewApi.length) {
                // fallback не обовʼязковий, залишено на випадок сумісності
              }

              setBatchLabel(''); setExpLocal(''); setExpUnlimited(true); setCreateEventIds([]); setCreateAllowAll(false)
              onClose()
              await onCreated()
            } catch (e: any) {
              const detail = e?.response?.data?.detail || e?.message || 'Не вдалося створити коди'
              setError(detail)
            } finally {
              setSaving(false)
            }
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Кількість</label>
              <input type="number" min={1} value={amount} onChange={e=>setAmount(parseInt(e.target.value||'0',10))} className="border rounded px-3 py-2 w-full" />
            </div>
            <div>
              <label className="block text-sm mb-1">Сесій/код</label>
              <input type="number" min={1} value={sessions} onChange={e=>setSessions(parseInt(e.target.value||'0',10))} className="border rounded px-3 py-2 w-full" />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Назва батчу</label>
            <input value={batchLabel} onChange={e=>setBatchLabel(e.target.value)} placeholder="напр. test-011" className="border rounded px-3 py-2 w-full" />
          </div>

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
              <input type="checkbox" checked={createAllowAll} onChange={e => setCreateAllowAll(e.target.checked)} />
              <span>Безліміт на всі події</span>
            </label>

            <DualList
              leftTitle="Доступні"
              rightTitle="Дозволені"
              left={events.filter(e => !createEventIds.includes(e.id)).map(e => ({ id: e.id, label: `${e.title} (${e.slug})` }))}
              right={events.filter(e => createEventIds.includes(e.id)).map(e => ({ id: e.id, label: `${e.title} (${e.slug})` }))}
              onChange={(ids) => setCreateEventIds(ids)}
              disabled={createAllowAll}
            />
            <div className="text-xs text-slate-500 mt-1">Подвійний клік переносить елемент між списками або виділяйте чекбоксами і тисніть стрілки.</div>
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="border rounded px-4 py-2">Скасувати</button>
            <button type="submit" className="bg-slate-900 text-white rounded px-4 py-2" disabled={saving}>{saving ? 'Створення…' : 'Створити'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}