//done
import { patchCode, deleteCode, reissueCode, forceLogoutCode } from '@/api/admin'

type Props = {
  allSelected: boolean
  toggleAll: () => void
  hasSelection: boolean
  selectedIds: number[]
  reload: () => Promise<void> | void
}

export default function BulkActionsBar({ allSelected, toggleAll, hasSelection, selectedIds, reload }: Props) {
  async function bulkReissue() {
    if (!hasSelection) return
    if (!confirm(`Пере-видати ${selectedIds.length} код(и)? Поточні значення заміняться.`)) return
    const results: { id: number; code: string }[] = []
    for (const id of selectedIds) {
      try {
        const r = await reissueCode(id)
        results.push({ id, code: r.code })
      } catch {}
    }
    alert(results.length ? `Нові значення:\n` + results.map(r => `#${r.id}: ${r.code}`).join('\n') : 'Нічого не оновлено')
    await reload()
  }

  async function bulkRevoke(active: boolean) {
    if (!hasSelection) return
    await Promise.all(selectedIds.map(id => patchCode(id, { revoked: !active })))
    await reload()
  }

  async function bulkForceLogout() {
    if (!hasSelection) return
    await Promise.all(selectedIds.map(id => forceLogoutCode(id).catch(() => {})))
    await reload()
  }

  async function bulkDelete() {
    if (!hasSelection) return
    if (!confirm(`Видалити ${selectedIds.length} код(и)? Дію не можна скасувати.`)) return
    await Promise.all(selectedIds.map(id => deleteCode(id).catch(() => {})))
    await reload()
  }

  return (
    <div className="flex flex-wrap items-center gap-2 bg-white rounded-xl shadow p-3">
      <label className="inline-flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={allSelected} onChange={toggleAll} />
        <span className="text-sm">{allSelected ? 'Зняти позначення' : 'Позначити всі'}</span>
      </label>
      <div className="grow" />
      <button className="px-3 py-1.5 rounded bg-amber-600 text-white disabled:opacity-50" disabled={!hasSelection} onClick={bulkReissue}>Пере-видати</button>
      <button className="px-3 py-1.5 rounded bg-green-600 text-white disabled:opacity-50" disabled={!hasSelection} onClick={() => bulkRevoke(true)}>Активувати</button>
      <button className="px-3 py-1.5 rounded bg-gray-600 text-white disabled:opacity-50" disabled={!hasSelection} onClick={() => bulkRevoke(false)}>Деактивувати</button>
      <button className="px-3 py-1.5 rounded bg-indigo-600 text-white disabled:opacity-50" disabled={!hasSelection} onClick={bulkForceLogout}>Вийти з усіх сесій</button>
      <button className="px-3 py-1.5 rounded bg-red-600 text-white disabled:opacity-50" disabled={!hasSelection} onClick={bulkDelete}>Видалити</button>
    </div>
  )
}