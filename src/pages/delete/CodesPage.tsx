import { useEffect, useMemo, useState } from 'react'
import { fetchCodes as apiFetchCodes, patchCode, deleteCode, reissueCode, forceLogoutCode, exportCodes, importCodesCSV } from '@/api/admin'
import api from '@/api/adminClient'
import { saveAs } from 'file-saver'
import DualList from '@/components/DualList'

type CodeRow = {
  id: number
  code?: string
  active: boolean
  max_concurrent_sessions: number
  cooldown_seconds: number
  event?: string | null
  created_at?: string
  expires_at?: string | null
  batch_label?: string | null
  allow_all_events?: boolean
  allowed_event_ids?: number[]
}

type EventItem = { id: number; title: string; slug: string }

export default function CodesPage() {
  const [items, setItems] = useState<CodeRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [limit] = useState(100)
  const [offset, setOffset] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // ── створення кодів ────────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false)
  const [amount, setAmount] = useState<number>(10)
  const [sessions, setSessions] = useState<number>(1)
  const [batchLabel, setBatchLabel] = useState<string>('') // колишній "event" як назва батчу
  const [expUnlimited, setExpUnlimited] = useState(true)
  const [expLocal, setExpLocal] = useState<string>('') // datetime-local

  // нове: доступ до подій при створенні
  const [createAllowAll, setCreateAllowAll] = useState(false)
  const [eventsOptions, setEventsOptions] = useState<EventItem[]>([])
  const [createEventIds, setCreateEventIds] = useState<number[]>([])
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)


  // ── редагування коду (expires + доступи) ───────────────────────────────────
  const [editId, setEditId] = useState<number | null>(null)
  const [editExpUnlimited, setEditExpUnlimited] = useState(true)
  const [editExpLocal, setEditExpLocal] = useState('')

  const [editAllowAll, setEditAllowAll] = useState(false)
  const [editEventIds, setEditEventIds] = useState<number[]>([])
  const [editLoading, setEditLoading] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // ── імпорт CSV ────────────────────────────────────────────────────────────
  const [showImport, setShowImport] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importHasHeader, setImportHasHeader] = useState(true)
  const [importDefaultSessions, setImportDefaultSessions] = useState(1)
  const [importEvent, setImportEvent] = useState('')
  const [codeCol, setCodeCol] = useState('code')
  const [sessCol, setSessCol] = useState('max_concurrent_sessions')
  const [importDefaultActive, setImportDefaultActive] = useState(true)
  const [importDefaultExpires, setImportDefaultExpires] = useState('') // datetime-local
  const [forceEvent, setForceEvent] = useState(false)
  const [forceSessions, setForceSessions] = useState(false)
  const [forceActive, setForceActive] = useState(false)
  const [forceExpires, setForceExpires] = useState(false)
  const [eventCol, setEventCol] = useState('event')
  const [activeCol, setActiveCol] = useState('active')
  const [expiresCol, setExpiresCol] = useState('expires_at')
  const [importDefaultActiveStr, setImportDefaultActiveStr] = useState<'yes'|'no'|'none'>('yes')

  // ── вибір ─────────────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const selectedIds = [...selected]
  const hasSelection = selectedIds.length > 0



  const allSelected = useMemo(
    () => items.length > 0 && items.every(i => selected.has(i.id)),
    [items, selected]
  )

  function toggleOne(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function toggleAll() {
    setSelected(prev => {
      if (allSelected) return new Set()
      const next = new Set<number>()
      items.forEach(i => next.add(i.id))
      return next
    })
  }
  function clearSelection() {
    setSelected(new Set())
  }

  function toLocalInputValue(dateString?: string) {
    if (!dateString) return ''
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    const tzOffset = date.getTimezoneOffset() * 60000
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
  }

  
  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { total, items } = await apiFetchCodes({ limit, offset, q: q || undefined })
      setTotal(total)
      setItems(items)
      setSelected(sel => new Set([...sel].filter(id => items.some(i => i.id === id))))
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не вдалося завантажити коди')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [offset, q])

  // Підтягнути список подій один раз
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/api/admin/events', { params: { page: 1, page_size: 500 } })

        // Підтримка обох форматів
        const raw = r.data
        const arr = Array.isArray(raw) ? raw : (raw?.items || [])

        setEventsOptions(arr.map(e => ({
          id: e.id,
          title: e.title,
          slug: e.slug
        })))
      } catch {
        setEventsOptions([])
      }
    })()
  }, [])

  // ───── Масові дії ─────
  async function bulkReissue() {
    if (!hasSelection) return
    if (!confirm(`Пере-видати ${selectedIds.length} код(и)? Поточні значення заміняться.`)) return
    const results: { id: number; code: string }[] = []
    for (const id of selectedIds) {
      try {
        const r = await reissueCode(id)
        results.push({ id, code: r.code })
      } catch { /* ignore */ }
    }
    alert(
      results.length
        ? `Нові значення:\n` + results.map(r => `#${r.id}: ${r.code}`).join('\n')
        : 'Нічого не оновлено'
    )
    await load()
  }

  async function bulkRevoke(active: boolean) {
    if (!hasSelection) return
    await Promise.all(selectedIds.map(id => patchCode(id, { revoked: !active })))
    await load()
  }

  async function bulkForceLogout() {
    if (!hasSelection) return
    await Promise.all(selectedIds.map(id => forceLogoutCode(id).catch(() => {})))
    await load()
  }

  async function bulkDelete() {
    if (!hasSelection) return
    if (!confirm(`Видалити ${selectedIds.length} код(и)? Дію не можна скасувати.`)) return
    await Promise.all(selectedIds.map(id => deleteCode(id).catch(() => {})))
    clearSelection()
    await load()
  }

  // ───── Одиночні дії в рядку ─────
  async function rowReissue(id: number) {
    const r = await reissueCode(id)
    alert(`Новий код: ${r.code}`)
    await load()
  }
  async function rowToggleActive(id: number, value: boolean) {
    await patchCode(id, { revoked: !value })
    await load()
  }
  async function rowDelete(id: number) {
    if (!confirm(`Видалити код #${id}?`)) return
    await deleteCode(id)
    await load()
  }
  async function rowForceLogout(id: number) {
    await forceLogoutCode(id).catch(() => {})
    await load()
  }

  // експорт
  async function handleExport() {
    try {
      const r = await exportCodes({ q: q.trim() || undefined })
      saveAs(r.data, 'codes_export.csv')
    } catch (e) {
      alert('Не вдалось експортувати CSV')
    }
  }

  // імпорт
  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!importFile) return

    const default_active =
      importDefaultActiveStr === 'yes' ? true
      : importDefaultActiveStr === 'no' ? false
      : undefined

    const r = await importCodesCSV(importFile, {
      has_header: importHasHeader,
      code_column: codeCol || 'code',
      sessions_column: sessCol || 'max_concurrent_sessions',
      active_column: activeCol || 'active',
      expires_column: expiresCol || 'expires_at',
      event_column: eventCol || 'event',

      default_sessions: importDefaultSessions,
      default_active,
      default_expires_at: importDefaultExpires
        ? new Date(importDefaultExpires).toISOString()
        : undefined,
      event: importEvent.trim() || undefined,

      force_sessions: forceSessions,
      force_active: forceActive,
      force_expires: forceExpires,
      force_event: forceEvent,
    })

    const { created, skipped, errors } = r.data || {}
    alert(`Імпорт завершено. Створено: ${created || 0}, пропущено: ${skipped || 0}${errors?.length ? `\nПомилки: ${errors.length}` : ''}`)
    setShowImport(false)
    setImportFile(null)
    await load()
  }

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-2xl font-semibold">Коди</h1>

        <div className="flex gap-2 items-center">
          <input
            className="border rounded px-3 py-2"
            placeholder="Пошук (код / івент / id)"
            value={q}
            onChange={e => { setQ(e.target.value); setOffset(0) }}
          />
          <button className="px-3 py-2 rounded bg-slate-900 text-white" onClick={load} disabled={loading}>
            Оновити
          </button>
          <button onClick={() => setShowCreate(true)} className="bg-slate-900 text-white rounded px-4 py-2">
            Додати коди
          </button>

          <button className="px-3 py-2 rounded border" onClick={handleExport}>
            Експорт CSV
          </button>
          <button className="px-3 py-2 rounded border" onClick={() => setShowImport(true)}>
            Імпорт CSV
          </button>
        </div>
      </div>

      {/* Панель масових дій */}
      <div className="flex flex-wrap items-center gap-2 bg-white rounded-xl shadow p-3">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} />
          <span className="text-sm">
            {allSelected ? 'Зняти позначення' : 'Позначити всі'}
          </span>
        </label>

        <div className="grow" />

        <button
          className="px-3 py-1.5 rounded bg-amber-600 text-white disabled:opacity-50"
          disabled={!hasSelection}
          onClick={bulkReissue}
        >
          Пере-видати
        </button>
        <button
          className="px-3 py-1.5 rounded bg-green-600 text-white disabled:opacity-50"
          disabled={!hasSelection}
          onClick={() => bulkRevoke(true)}
        >
          Активувати
        </button>
        <button
          className="px-3 py-1.5 rounded bg-gray-600 text-white disabled:opacity-50"
          disabled={!hasSelection}
          onClick={() => bulkRevoke(false)}
        >
          Деактивувати
        </button>
        <button
          className="px-3 py-1.5 rounded bg-indigo-600 text-white disabled:opacity-50"
          disabled={!hasSelection}
          onClick={bulkForceLogout}
        >
          Вийти з усіх сесій
        </button>
        <button
          className="px-3 py-1.5 rounded bg-red-600 text-white disabled:opacity-50"
          disabled={!hasSelection}
          onClick={bulkDelete}
        >
          Видалити
        </button>
      </div>

      {/* Таблиця */}
      <div className="overflow-auto rounded-xl bg-white shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3 text-left"></th>
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Код</th>
              <th className="p-3 text-left">Лейбл</th>
              <th className="p-3 text-left">Доступ до подій</th>
              <th className="p-3 text-left">Активний</th>
              <th className="p-3 text-left">Max сесій</th>
              <th className="p-3 text-left">Cooldown</th>
              <th className="p-3 text-left">Створено</th>
              <th className="p-3 text-left">Дійсний до</th>
              <th className="p-3 text-right">Дії</th>
            </tr>
          </thead>
          <tbody>
            {items.map(row => {
              const checked = selected.has(row.id)
              return (
                <tr key={row.id} className="border-t">
                  <td className="p-3">
                    <input type="checkbox" checked={checked} onChange={() => toggleOne(row.id)} />
                  </td>
                  <td className="p-3">{row.id}</td>
                  <td className="p-3 font-mono">{row.code ?? '—'}</td>
                  <td className="p-3">
                    {row.batch_label || '—'}
                  </td>
                  <td className="p-3">
                    {row.allow_all_events ? (
                      <span className="px-2 py-1 rounded text-xs bg-emerald-100 text-emerald-700">
                        Всі події
                      </span>
                    ) : (row.allowed_event_ids?.length || 0) > 0 ? (
                      <span className="px-2 py-1 rounded text-xs bg-sky-100 text-sky-700">
                        {row.allowed_event_ids!.length} дозволених
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs bg-slate-100 text-slate-600">
                        Немає доступу
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${row.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                      {row.active ? 'так' : 'ні'}
                    </span>
                  </td>
                  <td className="p-3">{row.max_concurrent_sessions}</td>
                  <td className="p-3">{row.cooldown_seconds}</td>
                  <td className="p-3">{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</td>
                  <td className="p-3">
                    {row.expires_at ? new Date(row.expires_at).toLocaleString() : 'Необмежений'}
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button className="px-2 py-1 rounded bg-amber-600 text-white" onClick={() => rowReissue(row.id)}>Пере-видати</button>
                    <button className="px-2 py-1 rounded bg-indigo-600 text-white" onClick={() => rowForceLogout(row.id)}>Log out</button>
                    {row.active ? (
                      <button className="px-2 py-1 rounded bg-gray-600 text-white" onClick={() => rowToggleActive(row.id, false)}>Деактив.</button>
                    ) : (
                      <button className="px-2 py-1 rounded bg-green-600 text-white" onClick={() => rowToggleActive(row.id, true)}>Актив.</button>
                    )}
                    <button
                      className="px-2 py-1 rounded bg-slate-700 text-white"
                      onClick={async () => {
                        // відкриваємо модалку й підтягуємо поточні налаштування
                        setEditId(row.id)
                        setEditError(null)
                        setEditLoading(true)
                        try {
                          // expires
                          if (row.expires_at) {
                            const d = new Date(row.expires_at)
                            const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                            setEditExpLocal(local.toISOString().slice(0,16))
                            setEditExpUnlimited(false)
                          } else {
                            setEditExpLocal('')
                            setEditExpUnlimited(true)
                          }
                          // allowed events
                          const r = await api.get(`/api/admin/codes/${row.id}`)
                          setEditAllowAll(Boolean(r.data?.allow_all_events))
                          setEditEventIds((r.data?.allowed_event_ids || []) as number[])
                        } catch (e:any) {
                          setEditError(e?.response?.data?.detail || 'Не вдалося завантажити налаштування доступу')
                        } finally {
                          setEditLoading(false)
                        }
                      }}
                    >
                      Редагувати
                    </button>
                    <button className="px-2 py-1 rounded bg-red-600 text-white" onClick={() => rowDelete(row.id)}>Видалити</button>
                  </td>
                </tr>
              )
            })}
            {items.length === 0 && !loading && (
              <tr><td className="p-6 text-center text-slate-500" colSpan={10}>Немає даних</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Модалка створення */}
{showCreate && (
  <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
    <div className="bg-white rounded-xl shadow p-6 w-[740px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Створити коди</h2>
        <button onClick={() => setShowCreate(false)} className="text-slate-500">✕</button>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (createSaving) return
          setCreateSaving(true)
          setCreateError(null)
          try {
            // 1) Формуємо payload для bulk: термін дії + лейбл батчу + ДОЗВОЛИ
            const payload: any = {
              amount,
              max_concurrent_sessions: sessions,
              event: batchLabel?.trim() || undefined, // ярлик партії
              allow_all: createAllowAll,
              event_ids: createAllowAll ? [] : createEventIds,
            }
            if (!expUnlimited && expLocal) {
              payload.expires_at = new Date(expLocal).toISOString()
            }

            // 2) Виклик bulk створення
            const r = await api.post(
              '/api/admin/codes/bulk',
              payload,
              { validateStatus: s => s >= 200 && s < 300 }
            )

            // 3) Визначаємо створені ID (новий бек повертає { codes: [...], ids: [...] })
            const idsFromNewApi: number[] = Array.isArray(r.data?.ids) ? r.data.ids : []
            // fallback на старий (якщо десь залишився)
            let createdIds: number[] = idsFromNewApi
            if (!createdIds.length) {
              const fromItems = Array.isArray(r.data?.items) ? r.data.items : []
              createdIds = fromItems.map((x: any) => x?.id).filter((v: any) => Number.isInteger(v))
            }

            // (Якщо бек уже записує allow_all/event_ids у /bulk — на цьому все.
            //  Якщо ні, розкоментуй нижче — але зазвичай не потрібно.)
            /*
            if (createdIds.length) {
              await Promise.all(
                createdIds.map(id =>
                  api.post(
                    `/api/admin/codes/${id}/allow_events`,
                    {
                      allow_all: createAllowAll,
                      event_ids: createAllowAll ? [] : createEventIds,
                    },
                    { validateStatus: s => s >= 200 && s < 300 }
                  )
                )
              )
            }
            */

            // 4) Скидаємо форму
            setShowCreate(false)
            setBatchLabel('')
            setExpLocal('')
            setExpUnlimited(true)
            setCreateEventIds([])
            setCreateAllowAll(false)

            await load()
          } catch (e: any) {
            const detail =
              e?.response?.data?.detail ||
              e?.message ||
              'Не вдалося створити коди'
            setCreateError(detail)
          } finally {
            setCreateSaving(false)
          }
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Кількість</label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={e=>setAmount(parseInt(e.target.value||'0',10))}
              className="border rounded px-3 py-2 w-full"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Сесій/код</label>
            <input
              type="number"
              min={1}
              value={sessions}
              onChange={e=>setSessions(parseInt(e.target.value||'0',10))}
              className="border rounded px-3 py-2 w-full"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Назва батчу</label>
          <input
            value={batchLabel}
            onChange={e=>setBatchLabel(e.target.value)}
            placeholder="напр. test-011"
            className="border rounded px-3 py-2 w-full"
          />
        </div>

        <div>
          <div>
            <label className="block text-sm mb-1">Дійсний до</label>
            <input
              type="datetime-local"
              value={expUnlimited ? '' : expLocal}
              onChange={e => { setExpLocal(e.target.value); setExpUnlimited(false) }}
              className="border rounded px-3 py-2 w-full"
              disabled={expUnlimited}
            />
            <label className="inline-flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={expUnlimited}
                onChange={e => {
                  setExpUnlimited(e.target.checked)
                  if (e.target.checked) setExpLocal('')
                }}
              />
              <span>Необмежений</span>
            </label>
          </div>

          <div className="mt-5">
            <label className="block text-sm mb-1">Доступ до подій</label>

            <label className="inline-flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={createAllowAll}
                onChange={e => setCreateAllowAll(e.target.checked)}
              />
              <span>Безліміт на всі події</span>
            </label>

            <DualList
              leftTitle="Доступні"
              rightTitle="Дозволені"
              left={eventsOptions
                .filter(e => !createEventIds.includes(e.id))
                .map(e => ({ id: e.id, label: `${e.title} (${e.slug})` }))}
              right={eventsOptions
                .filter(e => createEventIds.includes(e.id))
                .map(e => ({ id: e.id, label: `${e.title} (${e.slug})` }))}
              onChange={(ids) => setCreateEventIds(ids)}
              disabled={createAllowAll}
            />

            <div className="text-xs text-slate-500 mt-1">
              Подвійний клік переносить елемент між списками або виділяйте чекбоксами і тисніть стрілки.
            </div>
          </div>
        </div>

        {createError && <div className="text-red-600 text-sm">{createError}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={()=>setShowCreate(false)} className="border rounded px-4 py-2">
            Скасувати
          </button>
          <button type="submit" className="bg-slate-900 text-white rounded px-4 py-2" disabled={createSaving}>
            {createSaving ? 'Створення…' : 'Створити'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}


      {/* Модалка редагування (expires + доступи) */}
      {editId !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
          <div className="bg-white rounded-xl shadow p-6 w-[740px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Налаштування коду #{editId}</h2>
              <button onClick={() => setEditId(null)} className="text-slate-500">✕</button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (editSaving) return
                setEditSaving(true)
                setEditError(null)
                try {
                  // 1) expires_at
                  const payload: any = {}
                  if (editExpUnlimited) {
                    payload.expires_at = null
                  } else if (editExpLocal) {
                    payload.expires_at = new Date(editExpLocal).toISOString()
                  }
                  await patchCode(editId!, payload)

                  // 2) доступи (ВАЖЛИВО: використовуємо editAllowAll/editEventIds)
                  await api.post(
                    `/api/admin/codes/${editId}/allow_events`,
                    {
                      allow_all: editAllowAll,
                      event_ids: editAllowAll ? [] : editEventIds,
                    },
                    { validateStatus: s => s >= 200 && s < 300 }
                  )

                  setEditId(null)
                  await load()
                } catch (e:any) {
                  setEditError(e?.response?.data?.detail || 'Не вдалося зберегти')
                } finally {
                  setEditSaving(false)
                }
              }}
              className="space-y-5"
            >
              {editLoading ? (
                <div>Завантаження…</div>
              ) : (
                <>
                  <div>
                    <div>
                      <label className="block text-sm mb-1">Дійсний до</label>
                      <input
                        type="datetime-local"
                        value={editExpUnlimited ? '' : editExpLocal}
                        onChange={e => { setEditExpLocal(e.target.value); setEditExpUnlimited(false) }}
                        className="border rounded px-3 py-2 w-full"
                        disabled={editExpUnlimited}
                      />
                      <label className="inline-flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          checked={editExpUnlimited}
                          onChange={e => {
                            setEditExpUnlimited(e.target.checked)
                            if (e.target.checked) setEditExpLocal('')
                          }}
                        />
                        <span>Необмежений</span>
                      </label>
                    </div>

                    <div className="mt-5">
                      <label className="block text-sm mb-1">Доступ до подій</label>

                      <label className="inline-flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={editAllowAll}
                          onChange={e => setEditAllowAll(e.target.checked)}
                        />
                        <span>Безліміт на всі події</span>
                      </label>

                      <DualList
                        leftTitle="Доступні"
                        rightTitle="Дозволені"
                        left={eventsOptions
                          .filter(e => !editEventIds.includes(e.id))
                          .map(e => ({ id: e.id, label: `${e.title} (${e.slug})` }))}
                        right={eventsOptions
                          .filter(e => editEventIds.includes(e.id))
                          .map(e => ({ id: e.id, label: `${e.title} (${e.slug})` }))}
                        onChange={(ids) => setEditEventIds(ids)}
                        disabled={editAllowAll}
                      />

                      <div className="text-xs text-slate-500 mt-1">
                        Подвійний клік переносить елемент між списками або виділяйте чекбоксами і тисніть стрілки.
                      </div>
                    </div>
                  </div>

                  {editError && <div className="text-red-600 text-sm">{editError}</div>}

                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={()=>setEditId(null)} className="border rounded px-4 py-2">
                      Скасувати
                    </button>
                    <button type="submit" className="bg-slate-900 text-white rounded px-4 py-2" disabled={editSaving}>
                      {editSaving ? 'Збереження…' : 'Зберегти'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Модалка імпорту */}
      {showImport && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
          <div className="bg-white rounded-xl shadow p-6 w-[560px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Імпорт кодів із CSV</h2>
              <button onClick={() => setShowImport(false)} className="text-slate-500">✕</button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={e => setImportFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Сесій/код за замовчуванням</label>
                  <input
                    type="number" min={1}
                    value={importDefaultSessions}
                    onChange={e=>setImportDefaultSessions(parseInt(e.target.value||'1',10))}
                    className="border rounded px-3 py-2 w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">Івент (батч, як fallback)</label>
                  <input
                    value={importEvent}
                    onChange={e=>setImportEvent(e.target.value)}
                    placeholder="напр. fest-2025"
                    className="border rounded px-3 py-2 w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">Active за замовчуванням</label>
                  <select
                    value={importDefaultActiveStr}
                    onChange={e=>setImportDefaultActiveStr(e.target.value as any)}
                    className="border rounded px-3 py-2 w-full"
                  >
                    <option value="yes">Так</option>
                    <option value="no">Ні</option>
                    <option value="none">Не встановлювати</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-1">Expires за замовчуванням</label>
                  <input
                    type="datetime-local"
                    value={importDefaultExpires}
                    onChange={e=>setImportDefaultExpires(e.target.value)}
                    className="border rounded px-3 py-2 w-full"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={importHasHeader} onChange={e=>setImportHasHeader(e.target.checked)} />
                  <span>CSV має заголовок</span>
                </label>
              </div>

              {importHasHeader && (
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
                <button type="button" className="border rounded px-4 py-2" onClick={()=>setShowImport(false)}>Скасувати</button>
                <button type="submit" className="bg-slate-900 text-white rounded px-4 py-2" disabled={!importFile}>
                  Імпортувати
                </button>
              </div>
            </form>

            <div className="text-xs text-slate-500 mt-3">
              Формат CSV (як у експорті):
              id, code, event, max_concurrent_sessions, active, created_at, expires_at
              • id/created_at ігноруються при імпорті
              • якщо колонки немає або порожньо — використовується значення за замовчуванням
              • якщо увімкнено “Перезаписати …” — значення з форми має пріоритет над CSV
            </div>
          </div>
        </div>
      )}

      {/* Пагінація */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">Всього: {total}</div>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded border" disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - limit))}>Назад</button>
          <button className="px-3 py-1 rounded border" disabled={offset + limit >= total} onClick={() => setOffset(o => o + limit)}>Вперед</button>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}
    </div>
  )
}
