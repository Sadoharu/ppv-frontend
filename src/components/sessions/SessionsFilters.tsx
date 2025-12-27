// src/components/sessions/SessionsFilters.tsx
//done
type Props = {
  q: string
  setQ: (v: string) => void
  onlyActive: boolean
  setOnlyActive: (v: boolean) => void
  onlyConnected: boolean
  setOnlyConnected: (v: boolean) => void
  loading: boolean
  onRefresh: () => void
}

export default function SessionsFilters({
  q, setQ, onlyActive, setOnlyActive, onlyConnected, setOnlyConnected, loading, onRefresh,
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow p-3 flex flex-wrap items-center gap-3">
      <input
        className="border rounded px-3 py-2"
        placeholder="Пошук (id / код / IP / UA)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <label className="inline-flex items-center gap-2">
        <input type="checkbox" checked={onlyActive} onChange={e => setOnlyActive(e.target.checked)} />
        <span>Лише активні</span>
      </label>
      <label className="inline-flex items-center gap-2">
        <input type="checkbox" checked={onlyConnected} onChange={e => setOnlyConnected(e.target.checked)} />
        <span>Лише online (відкрита сторінка)</span>
      </label>

      <div className="grow" />
      <button className="px-3 py-2 rounded border" onClick={onRefresh} disabled={loading}>
        Оновити
      </button>
    </div>
  )
}
