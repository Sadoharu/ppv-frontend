// src/components/codes/CodesTable.tsx
//done
import type { CodeRow, EventItem } from '@/types/codes'
import api from '@/api/adminClient'

type Props = {
  items: CodeRow[]
  selected: Set<number>
  onToggleOne: (id: number) => void
  onRowReissue: (id: number) => Promise<void>
  onRowToggleActive: (id: number, value: boolean) => Promise<void>
  onRowDelete: (id: number) => Promise<void>
  onRowForceLogout: (id: number) => Promise<void>
  onOpenEdit: (row: CodeRow, preload: (allowAll: boolean, eventIds: number[]) => void) => void
  onOpenStats: (id: number) => void
}

export default function CodesTable({ items, selected, onToggleOne, onRowReissue, onRowToggleActive, onRowDelete, onRowForceLogout, onOpenEdit, onOpenStats }: Props) {
  return (
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
                <td className="p-3"><input type="checkbox" checked={checked} onChange={() => onToggleOne(row.id)} /></td>
                <td className="p-3">{row.id}</td>
                <td className="p-3 font-mono">{row.code ?? '—'}</td>
                <td className="p-3">{row.batch_label || '—'}</td>
                <td className="p-3">
                  {row.allow_all_events ? (
                    <span className="px-2 py-1 rounded text-xs bg-emerald-100 text-emerald-700">Всі події</span>
                  ) : (row.allowed_event_ids?.length || 0) > 0 ? (
                    <span className="px-2 py-1 rounded text-xs bg-sky-100 text-sky-700">{row.allowed_event_ids!.length} дозволених</span>
                  ) : (
                    <span className="px-2 py-1 rounded text-xs bg-slate-100 text-slate-600">Немає доступу</span>
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
                <td className="p-3">{row.expires_at ? new Date(row.expires_at).toLocaleString() : 'Необмежений'}</td>
                <td className="p-3">
                <div className="grid grid-cols-3 gap-2">
                    <button
                    className="w-full px-2 py-1 rounded bg-amber-600 text-white"
                    onClick={() => onRowReissue(row.id)}
                    >
                    Пере-видати
                    </button>

                    <button
                    className="w-full px-2 py-1 rounded bg-indigo-600 text-white"
                    onClick={() => onRowForceLogout(row.id)}
                    >
                    Log out
                    </button>

                    {row.active ? (
                    <button
                        className="w-full px-2 py-1 rounded bg-gray-600 text-white"
                        onClick={() => onRowToggleActive(row.id, false)}
                    >
                        Деактив.
                    </button>
                    ) : (
                    <button
                        className="w-full px-2 py-1 rounded bg-green-600 text-white"
                        onClick={() => onRowToggleActive(row.id, true)}
                    >
                        Актив.
                    </button>
                    )}

                    <button
                    className="w-full px-2 py-1 rounded bg-slate-700 text-white"
                    onClick={async () => {
                        try {
                        const r = await api.get(`/api/admin/codes/${row.id}`)
                        onOpenEdit(
                            row,
                            Boolean(r.data?.allow_all_events),
                            (r.data?.allowed_event_ids || []) as number[]
                        )
                        } catch {
                        onOpenEdit(row, Boolean(row.allow_all_events), row.allowed_event_ids || [])
                        }
                    }}
                    >
                    Редагувати
                    </button>

                    <button
                    className="w-full px-2 py-1 rounded bg-sky-600 text-white"
                    onClick={() => onOpenStats(row.id)}
                    >
                    Статистика
                    </button>

                    <button
                    className="w-full px-2 py-1 rounded bg-red-600 text-white"
                    onClick={() => onRowDelete(row.id)}
                    >
                    Видалити
                    </button>
                </div>
                </td>

              </tr>
            )
          })}
          {items.length === 0 && (
            <tr><td className="p-6 text-center text-slate-500" colSpan={10}>Немає даних</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}