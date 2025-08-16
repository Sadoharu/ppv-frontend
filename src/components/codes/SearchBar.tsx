//done
import { saveAs } from 'file-saver'
import { exportCodes } from '@/api/admin'

type Props = {
  q: string
  setQ: (v: string) => void
  loading: boolean
  onRefresh: () => void
  onOpenCreate: () => void
  onOpenImport: () => void
}

export default function SearchBar({ q, setQ, loading, onRefresh, onOpenCreate, onOpenImport }: Props) {
  async function handleExport() {
    try {
      const r = await exportCodes({ q: q.trim() || undefined })
      saveAs(r.data, 'codes_export.csv')
    } catch {
      alert('Не вдалось експортувати CSV')
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <input
        className="border rounded px-3 py-2"
        placeholder="Пошук (код / івент / id)"
        value={q}
        onChange={e => setQ(e.target.value)}
      />
      <button className="px-3 py-2 rounded bg-slate-900 text-white" onClick={onRefresh} disabled={loading}>
        Оновити
      </button>
      <button onClick={onOpenCreate} className="bg-slate-900 text-white rounded px-4 py-2">
        Додати коди
      </button>
      <button className="px-3 py-2 rounded border" onClick={handleExport}>Експорт CSV</button>
      <button className="px-3 py-2 rounded border" onClick={onOpenImport}>Імпорт CSV</button>
    </div>
  )
}