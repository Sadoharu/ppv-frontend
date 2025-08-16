//done
import { useEffect, useState } from 'react'
import type { CodeStats } from '@/api/analytics'
import { getCodeStats } from '@/api/analytics'

type Props = {
  codeId: number | null
  onClose: () => void
}

function formatBytes(n: number) {
  if (!Number.isFinite(n)) return '—'
  const units = ['B','KB','MB','GB','TB']
  let i = 0, v = n
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

function formatDuration(sec: number) {
  if (!Number.isFinite(sec)) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const hh = h > 0 ? `${h}г ` : ''
  const mm = m > 0 ? `${m}хв ` : ''
  const ss = `${s}с`
  return `${hh}${mm}${ss}`.trim()
}

export default function CodeStatsModal({ codeId, onClose }: Props) {
  const open = codeId !== null
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [stats, setStats] = useState<CodeStats | null>(null)

  useEffect(() => {
    if (!open || !codeId) return
    let dead = false
    setLoading(true); setErr(null); setStats(null)
    ;(async () => {
      try {
        const data = await getCodeStats(codeId)
        if (!dead) setStats(data)
      } catch (e: any) {
        if (!dead) setErr(e?.response?.data?.detail || 'Не вдалося завантажити статистику')
      } finally {
        if (!dead) setLoading(false)
      }
    })()
    return () => { dead = true }
  }, [open, codeId])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
      <div className="bg-white rounded-xl shadow p-6 w-[560px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Статистика коду #{codeId}</h2>
          <button onClick={onClose} className="text-slate-500">✕</button>
        </div>

        {loading && <div>Завантаження…</div>}
        {err && <div className="text-red-600 text-sm">{err}</div>}

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50">
              <div className="text-slate-500 text-sm">Сесій</div>
              <div className="text-3xl font-bold">{stats.sessions}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50">
              <div className="text-slate-500 text-sm">Перегляд</div>
              <div className="text-3xl font-bold">{formatDuration(stats.watch_seconds)}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50">
              <div className="text-slate-500 text-sm">Трафік</div>
              <div className="text-3xl font-bold">{formatBytes(stats.bytes_out)}</div>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="border rounded px-4 py-2">Закрити</button>
        </div>
      </div>
    </div>
  )
}
