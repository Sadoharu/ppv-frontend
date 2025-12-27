// src/pages/admin/CodesPage.tsx
//done
import { useCallback, useMemo, useState } from 'react'
import { patchCode, deleteCode, reissueCode, forceLogoutCode } from '@/api/admin'
import { useCodes } from '@/hooks/useCodes'
import { useEvents } from '@/hooks/useEvents'
import { useSelection } from '@/hooks/useSelection'
import SearchBar from '@/components/codes/SearchBar'
import BulkActionsBar from '@/components/codes/BulkActionsBar'
import CodesTable from '@/components/codes/CodesTable'
import CreateCodesModal from '@/components/codes/modals/CreateCodesModal'
import EditCodeModal from '@/components/codes/modals/EditCodeModal'
import ImportCSVModal from '@/components/codes/modals/ImportCSVModal'
import type { CodeRow } from '@/types/codes'
import CodeStatsModal from '@/components/codes/modals/CodeStatsModal'

export default function CodesPage() {
  const { items, total, loading, error, q, setQ, offset, setOffset, limit, load, idsInView } = useCodes(100)
  const events = useEvents()
  const sel = useSelection(idsInView)

  const [showCreate, setShowCreate] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editPreload, setEditPreload] = useState<{ allowAll: boolean; eventIds: number[] } | null>(null)
  const [statsCodeId, setStatsCodeId] = useState<number | null>(null)

  // одиночні дії
  const rowReissue = useCallback(async (id: number) => {
    const r = await reissueCode(id)
    alert(`Новий код: ${r.code}`)
    await load()
  }, [load])

  const rowToggleActive = useCallback(async (id: number, value: boolean) => {
    await patchCode(id, { revoked: !value })
    await load()
  }, [load])

  const rowDelete = useCallback(async (id: number) => {
    if (!confirm(`Видалити код #${id}?`)) return
    await deleteCode(id)
    await load()
  }, [load])

  const rowForceLogout = useCallback(async (id: number) => {
    await forceLogoutCode(id).catch(() => {})
    await load()
  }, [load])

  const openEdit = useCallback((row: CodeRow, preloadAllowAll: boolean, preloadEventIds: number[]) => {
    setEditId(row.id)
    setEditPreload({ allowAll: preloadAllowAll, eventIds: preloadEventIds })
  }, [])

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-2xl font-semibold">Коди</h1>
        <SearchBar q={q} setQ={(v)=>setQ(v)} loading={loading} onRefresh={load} onOpenCreate={()=>setShowCreate(true)} onOpenImport={()=>setShowImport(true)} />
      </div>

      <BulkActionsBar allSelected={sel.allSelected} toggleAll={sel.toggleAll} hasSelection={sel.hasSelection} selectedIds={sel.selectedIds} reload={load} />

      <CodesTable
        items={items}
        selected={sel.selected}
        onToggleOne={sel.toggleOne}
        onRowReissue={rowReissue}
        onRowToggleActive={rowToggleActive}
        onRowDelete={rowDelete}
        onRowForceLogout={rowForceLogout}
        onOpenEdit={openEdit}
        onOpenStats={(id) => setStatsCodeId(id)} 
      />

      {/* Пагінація */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">Всього: {total}</div>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded border" disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - limit))}>Назад</button>
          <button className="px-3 py-1 rounded border" disabled={offset + limit >= total} onClick={() => setOffset(o => o + limit)}>Вперед</button>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <CreateCodesModal open={showCreate} onClose={()=>setShowCreate(false)} onCreated={load} events={events} />
      <EditCodeModal id={editId} onClose={()=>{ setEditId(null); setEditPreload(null) }} onSaved={load} events={events} preload={editPreload} />
      <ImportCSVModal open={showImport} onClose={()=>setShowImport(false)} onImported={load} />
        <CodeStatsModal codeId={statsCodeId} onClose={() => setStatsCodeId(null)} />
    </div>
  )
}