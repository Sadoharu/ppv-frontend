// src/components/codes/modals/ImportCSVModal.tsx
//done
import { useState } from 'react'
import { importCodesCSV } from '@/api/admin'

type Props = {
  open: boolean
  onClose: () => void
  onImported: () => Promise<void> | void
}

export default function ImportCSVModal({ open, onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [hasHeader, setHasHeader] = useState(true)
  const [defaultSessions, setDefaultSessions] = useState(1)
  const [importEvent, setImportEvent] = useState('')
  const [codeCol, setCodeCol] = useState('code')
  const [sessCol, setSessCol] = useState('max_concurrent_sessions')
  const [activeCol, setActiveCol] = useState('active')
  const [expiresCol, setExpiresCol] = useState('expires_at')
  const [eventCol, setEventCol] = useState('event')
  const [defaultActiveStr, setDefaultActiveStr] = useState<'yes'|'no'|'none'>('yes')
  const [defaultExpires, setDefaultExpires] = useState('')

  const [forceEvent, setForceEvent] = useState(false)
  const [forceSessions, setForceSessions] = useState(false)
  const [forceActive, setForceActive] = useState(false)
  const [forceExpires, setForceExpires] = useState(false)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
      <div className="bg-white rounded-xl shadow p-6 w-[560px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Імпорт кодів із CSV</h2>
          <button onClick={onClose} className="text-slate-500">✕</button>
        </div>

        <form onSubmit={async (e) => {
          e.preventDefault()
          if (!file) return

          const default_active = defaultActiveStr === 'yes' ? true : defaultActiveStr === 'no' ? false : undefined
          const r = await importCodesCSV(file, {
            has_header: hasHeader,
            code_column: codeCol || 'code',
            sessions_column: sessCol || 'max_concurrent_sessions',
            active_column: activeCol || 'active',
            expires_column: expiresCol || 'expires_at',
            event_column: eventCol || 'event',

            default_sessions: defaultSessions,
            default_active,
            default_expires_at: defaultExpires ? new Date(defaultExpires).toISOString() : undefined,
            event: importEvent.trim() || undefined,

            force_sessions: forceSessions,
            force_active: forceActive,
            force_expires: forceExpires,
            force_event: forceEvent,
          })

          const { created, skipped, errors } = r.data || {}
          alert(`Імпорт завершено. Створено: ${created || 0}, пропущено: ${skipped || 0}${errors?.length ? `\nПомилки: ${errors.length}` : ''}`)
          onClose()
          await onImported()
        }} className="space-y-4">
          <div>
            <input type="file" accept=".csv,text/csv" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Сесій/код за замовчуванням</label>
              <input type="number" min={1} value={defaultSessions} onChange={e=>setDefaultSessions(parseInt(e.target.value||'1',10))} className="border rounded px-3 py-2 w-full" />
            </div>
            <div>
              <label className="block text-sm mb-1">Івент (батч, як fallback)</label>
              <input value={importEvent} onChange={e=>setImportEvent(e.target.value)} placeholder="напр. fest-2025" className="border rounded px-3 py-2 w-full" />
            </div>
            <div>
              <label className="block text-sm mb-1">Active за замовчуванням</label>
              <select value={defaultActiveStr} onChange={e=>setDefaultActiveStr(e.target.value as any)} className="border rounded px-3 py-2 w-full">
                <option value="yes">Так</option>
                <option value="no">Ні</option>
                <option value="none">Не встановлювати</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Expires за замовчуванням</label>
              <input type="datetime-local" value={defaultExpires} onChange={e=>setDefaultExpires(e.target.value)} className="border rounded px-3 py-2 w-full" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={hasHeader} onChange={e=>setHasHeader(e.target.checked)} />
              <span>CSV має заголовок</span>
            </label>
          </div>

          {hasHeader && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Колонка code</label>
                <input value={codeCol} onChange={e=>setCodeCol(e.target.value)} className="border rounded px-3 py-2 w-full"/>
              </div>
              <div>
                <label className="block text-sm mb-1">Колонка max_concurrent_sessions</label>
                <input value={sessCol} onChange={e=>setSessCol(e.target.value)} className="border rounded px-3 py-2 w-full"/>
              </div>
              <div>
                <label className="block text-sm mb-1">Колонка active</label>
                <input value={activeCol} onChange={e=>setActiveCol(e.target.value)} className="border rounded px-3 py-2 w-full"/>
              </div>
              <div>
                <label className="block text-sm mb-1">Колонка expires_at</label>
                <input value={expiresCol} onChange={e=>setExpiresCol(e.target.value)} className="border rounded px-3 py-2 w-full"/>
              </div>
              <div>
                <label className="block text-sm mb-1">Колонка event</label>
                <input value={eventCol} onChange={e=>setEventCol(e.target.value)} className="border rounded px-3 py-2 w-full"/>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={forceSessions} onChange={e=>setForceSessions(e.target.checked)} />
              <span>Перезаписати sessions із форми</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={forceActive} onChange={e=>setForceActive(e.target.checked)} />
              <span>Перезаписати active із форми</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={forceExpires} onChange={e=>setForceExpires(e.target.checked)} />
              <span>Перезаписати expires_at із форми</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={forceEvent} onChange={e=>setForceEvent(e.target.checked)} />
              <span>Перезаписати event із форми</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="border rounded px-4 py-2" onClick={onClose}>Скасувати</button>
            <button type="submit" className="bg-slate-900 text-white rounded px-4 py-2" disabled={!file}>Імпортувати</button>
          </div>
        </form>

        <div className="text-xs text-slate-500 mt-3">
          Формат CSV (як у експорті): id, code, event, max_concurrent_sessions, active, created_at, expires_at
          • id/created_at ігноруються при імпорті • якщо колонки немає або порожньо — використовується значення за замовчуванням • якщо увімкнено “Перезаписати …” — значення з форми має пріоритет над CSV
        </div>
      </div>
    </div>
  )
}