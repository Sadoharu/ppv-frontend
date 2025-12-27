// src/components/sessions/SessionsTable.tsx
//done
import { fmtBytes, fmtDate, fmtDuration } from '@/utils/format'
import type { SessionRow } from '@/types/sessions'

type Props = {
  items: SessionRow[]
  onTerminate: (id: string) => void | Promise<void>
  onDelete: (id: string) => void | Promise<void>
}

export default function SessionsTable({ items, onTerminate, onDelete }: Props) {
  return (
    <div className="overflow-auto rounded-xl bg-white shadow">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="p-3 text-left">Стан</th>
            <th className="p-3 text-left">ID</th>
            <th className="p-3 text-left">Код / Подія</th>
            <th className="p-3 text-left">IP</th>
            <th className="p-3 text-left">Браузер</th>
            <th className="p-3 text-left">Відкрито</th>
            <th className="p-3 text-left">Останній online</th>
            <th className="p-3 text-left">Expires</th>
            <th className="p-3 text-left">Перегляд</th>
            <th className="p-3 text-left">Трафік</th>
            <th className="p-3 text-right">Дії</th>
          </tr>
        </thead>
        <tbody>
          {items.map(s => (
            <tr key={s.id} className="border-t align-top">
              <td className="p-3">
                <div className="flex flex-col gap-1">
                  <span className={`px-2 py-1 rounded text-xs w-fit ${s.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                    {s.active ? 'активна' : 'завершена'}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs w-fit ${s.online ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                    {s.online ? 'online' : 'offline'}
                  </span>
                </div>
              </td>
              <td className="p-3 font-mono break-all">{s.id}</td>
              <td className="p-3">
                <div className="font-mono">{s.code ?? `#${s.code_id}`}</div>
                <div className="text-slate-500 text-xs">{s.event || '—'}</div>
              </td>
              <td className="p-3">{s.ip || '—'}</td>
              <td className="p-3">
                <div className="max-w-[280px] break-words">{s.user_agent || s.ua || '—'}</div>
              </td>
              <td className="p-3">{fmtDate(s.created_at)}</td>
              <td className="p-3">{fmtDate(s.last_seen)}</td>
              <td className="p-3">{fmtDate(s.expires_at)}</td>
              <td className="p-3">{fmtDuration(s.watch_seconds)}</td>
              <td className="p-3">{fmtBytes(s.bytes_out)}</td>
              <td className="p-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="w-full px-2 py-1 rounded bg-amber-600 text-white disabled:opacity-50"
                    disabled={!s.active}
                    onClick={() => onTerminate(s.id)}
                  >
                    Завершити
                  </button>
                  <button
                    className="w-full px-2 py-1 rounded bg-red-600 text-white"
                    onClick={() => onDelete(s.id)}
                  >
                    Видалити
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td className="p-6 text-center text-slate-500" colSpan={11}>Немає даних</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
