// src/pages/admin/SessionsPage.tsx
//done
import { useCallback } from 'react'
import { useSessions } from '@/hooks/useSessions'
import SessionsFilters from '@/components/sessions/SessionsFilters'
import SessionsTable from '@/components/sessions/SessionsTable'
import adminApi from '@/api/adminClient'

export default function SessionsPage() {
  const {
    items, total, loading,
    q, setQ,
    onlyActive, setOnlyActive,
    onlyConnected, setOnlyConnected,
    view, load,
    upsert, drop,
  } = useSessions()

  const terminate = useCallback(async (id: string) => {
    if (!confirm(`Завершити сесію ${id}?`)) return
    try {
      await adminApi.post(`/api/admin/sessions/${encodeURIComponent(id)}/terminate`)
      upsert({ id, active: false, connected: false, online: false })
    } catch {}
  }, [upsert])

  const del = useCallback(async (id: string) => {
    if (!confirm(`Видалити сесію ${id}?`)) return
    try {
      await adminApi.delete(`/api/admin/sessions/${encodeURIComponent(id)}`)
      drop(id)
    } catch {}
  }, [drop])

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Сесії</h1>
        <div className="text-sm text-slate-600">Всього: {total}</div>
      </div>

      <SessionsFilters
        q={q} setQ={setQ}
        onlyActive={onlyActive} setOnlyActive={setOnlyActive}
        onlyConnected={onlyConnected} setOnlyConnected={setOnlyConnected}
        loading={loading} onRefresh={load}
      />

      <SessionsTable items={view} onTerminate={terminate} onDelete={del} />

      {loading && <div className="text-slate-600 text-sm">Завантаження…</div>}
    </div>
  )
}
