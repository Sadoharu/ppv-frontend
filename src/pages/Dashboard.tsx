import { useEffect, useState } from 'react'
import api from '@/api/adminClient'
import { dt } from '@/utils/format-old'
import { adminWS } from '@/api/ws'
import { Link } from 'react-router-dom'

type WSMsg = { type?: string; payload?: any } | any

export default function Dashboard() {
  const [ccu, setCcu] = useState<number | null>(null)
  const [lastEvent, setLastEvent] = useState<string>('')
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const [ccuErr, setCcuErr] = useState<string | null>(null)

  // первинне значення CCU через HTTP
  useEffect(() => {
    setCcuErr(null)
    api.get('/api/admin/ccu')
      .then(r => {
        const val = r.data?.ccu ?? r.data
        if (typeof val === 'number') setCcu(val)
        else setCcuErr('Неочікувана відповідь від сервера')
      })
      .catch(e => {
        setCcuErr(e?.response?.data?.detail || 'Не вдалося отримати CCU')
      })
  }, [])

  // Live-оновлення через WebSocket
  useEffect(() => {
    let ws: WebSocket | null = null
    let stopped = false
    let retry = 500

    const open = () => {
      setWsStatus('connecting')
      const sock = adminWS() // <-- без параметрів, токен підставляється всередині
      ws = sock

      sock.onopen = () => {
        setWsStatus('connected')
        retry = 500
      }

      sock.onmessage = (e) => {
        try {
          const msg: WSMsg = JSON.parse(e.data)
          if (msg?.type === 'ccu' && typeof msg.payload === 'number') setCcu(msg.payload)
          setLastEvent(JSON.stringify(msg))
        } catch {
          // ігноруємо не-JSON
        }
      }

      sock.onerror = () => {
        try { sock.close() } catch {}
      }

      sock.onclose = () => {
        setWsStatus('disconnected')
        if (!stopped) {
          setTimeout(open, Math.min(retry, 5000))
          retry = retry * 1.5
        }
      }
    }

    open()
    return () => {
      stopped = true
      try { ws?.close() } catch {}
    }
  }, [])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Панель</h1>
        <div className={`text-sm ${wsStatus === 'connected' ? 'text-green-600' : wsStatus === 'connecting' ? 'text-amber-600' : 'text-red-600'}`}>
          WS: {wsStatus}
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white shadow">
          <div className="text-slate-500">Онлайн (CCU)</div>
          <div className="text-3xl font-bold">
            {ccuErr ? <span className="text-red-600 text-base">{ccuErr}</span> : (ccu ?? '—')}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white shadow">
          <div className="text-slate-500">Остання подія</div>
          <div className="text-sm break-all">{lastEvent || '—'}</div>
        </div>

        <div className="p-4 rounded-xl bg-white shadow">
          <div className="text-slate-500">Час</div>
          <div>{dt(Date.now())}</div>
        </div>
      </div>
    </div>
  )
}
