// src/pages/Sessions.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import adminApi from '@/api/adminClient'
import { adminWS } from '@/api/ws'
import { listSessions, revokeSession, deleteSession } from '@/api/adminSessions'
import api from '@/api/adminClient'
import DataTable from '@/components/DataTable'
import { ColumnDef } from '@tanstack/react-table'

type SessionRow = {
  id: string
  code_id: number
  code?: string
  event?: string | null

  active: boolean
  connected: boolean
  online?: boolean
  ip?: string | null
  ua?: string
  user_agent?: string | null

  created_at?: string | null
  last_seen?: string | null
  expires_at?: string | null

  watch_seconds?: number
  bytes_out?: number
}

type ListResponse = { total: number; items: SessionRow[] } | SessionRow[]

function fmtDate(s?: string | null) {
  if (!s) return '—'
  try { return new Date(s).toLocaleString() } catch { return s }
}
function fmtDuration(sec?: number) {
  if (!sec && sec !== 0) return '—'
  const s = Math.max(0, sec|0)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  if (h) return `${h}г ${m}х ${ss}с`
  if (m) return `${m}х ${ss}с`
  return `${ss}с`
}
function fmtBytes(n?: number) {
  if (n == null) return '—'
  const u = ['B','KB','MB','GB','TB']
  let x = n, i = 0
  while (x >= 1024 && i < u.length-1) { x /= 1024; i++ }
  return `${x.toFixed( (i===0) ? 0 : 1 )} ${u[i]}`
}

export default function Sessions() {
  const [items, setItems] = useState<SessionRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [onlyActive, setOnlyActive] = useState(true)
  const [onlyConnected, setOnlyConnected] = useState(false)

  // для локальних апдейтів через WS:
  const itemsRef = useRef<SessionRow[]>([])
  itemsRef.current = items

  const load = async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = { limit: 200 }
      if (q.trim()) params.q = q.trim()
      if (onlyActive) params.active = 1

      const r = await adminApi.get('/api/admin/sessions', { params })
      const data: ListResponse = r.data
      const list = Array.isArray(data) ? data : (data.items || [])
      setItems(list)
      setTotal(Array.isArray(data) ? list.length : (data.total ?? list.length))
    } catch {
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [q, onlyActive, onlyConnected])

  // апдейт або вставка елемента по id
  const upsert = (row: Partial<SessionRow> & { id: string }) => {
    setItems(prev => {
      const idx = prev.findIndex(x => x.id === row.id)
      if (idx === -1) return [row as SessionRow, ...prev]
      const merged = { ...prev[idx], ...row }
      const copy = prev.slice()
      copy[idx] = merged
      return copy
    })
  }

  // видалити елемент
  const drop = (id: string) => {
    setItems(prev => prev.filter(x => x.id !== id))
  }

  // live-апдейти через адмінський WS
useEffect(() => {
  const ws = adminWS() // функція сама додасть Bearer / ?token
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data)
      switch (msg.type) {
        case 'session_login':
        case 'session_refresh':
        case 'session_connected':
        case 'session_disconnected':
        case 'session_heartbeat':
        case 'session_stats':
        case 'session_updated':
          if (msg.payload?.id) upsert(msg.payload)
          break
        case 'session_logout':
        case 'session_revoked':
        case 'session_deleted':
          if (msg.payload?.id) drop(msg.payload.id)
          break
        default:
          break
      }
    } catch {}
  }
  ws.onerror = () => { try { ws.close() } catch {} }
  return () => { try { ws.close() } catch {} }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])

  // дії
  const terminate = async (id: string) => {
    if (!confirm(`Завершити сесію ${id}?`)) return
    try {
      await adminApi.post(`/api/admin/sessions/${encodeURIComponent(id)}/terminate`)
      upsert({ id, active: false, connected: false, online: false })
    } catch {}
  }
  const del = async (id: string) => {
    if (!confirm(`Видалити сесію ${id}?`)) return
    try {
      await adminApi.delete(`/api/admin/sessions/${encodeURIComponent(id)}`)
      drop(id)
    } catch {}
  }

  // відфільтровано локально (щоб не чекати бек при простих тумблерах)
  const view = useMemo(() => {
    let arr = items
    // додаткові локальні фільтри (бек і так їх отримує, але хай буде миттєво)
    if (onlyActive) arr = arr.filter(x => x.active)
    if (onlyConnected) arr = arr.filter(x => x.online === true)
    return arr
  }, [items, onlyActive, onlyConnected])

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Сесії</h1>
        <div className="text-sm text-slate-600">Всього: {total}</div>
      </div>

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
        <button className="px-3 py-2 rounded border" onClick={load} disabled={loading}>
          Оновити
        </button>
      </div>

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
            {view.map(s => (
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
                  <div className="max-w-[280px] break-words">{s.user_agent || '—'}</div>
                </td>
                <td className="p-3">{fmtDate(s.created_at)}</td>
                <td className="p-3">{fmtDate(s.last_seen)}</td>
                <td className="p-3">{fmtDate(s.expires_at)}</td>
                <td className="p-3">{fmtDuration(s.watch_seconds)}</td>
                <td className="p-3">{fmtBytes(s.bytes_out)}</td>
                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                  <button
                    className="px-2 py-1 rounded bg-amber-600 text-white disabled:opacity-50"
                    disabled={!s.active}
                    onClick={() => terminate(s.id)}
                  >
                    Завершити
                  </button>
                  <button
                    className="px-2 py-1 rounded bg-red-600 text-white"
                    onClick={() => del(s.id)}
                  >
                    Видалити
                  </button>
                </td>
              </tr>
            ))}
            {view.length === 0 && !loading && (
              <tr><td className="p-6 text-center text-slate-500" colSpan={11}>Немає даних</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && <div className="text-slate-600 text-sm">Завантаження…</div>}
    </div>
  )
}
