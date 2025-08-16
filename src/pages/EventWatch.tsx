import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import userApi from '@/api/userClient'
import { fetchEventPublic, type EventPublic } from '@/api/publicClient'

export default function EventWatch() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [ev, setEv] = useState<EventPublic | null>(null)
  const [ready, setReady] = useState(false)   // тільки для спіннера
  const hbTimer = useRef<number | null>(null)

  // хелпер для редіректу на логін з причиною
  const goLogin = (reason: string) => {
    if (!slug) return
    navigate(`/login?redirect=/events/${slug}&reason=${encodeURIComponent(reason)}`)
  }

  // 1) публічні дані
  useEffect(() => {
    let dead = false
    setReady(false)
    setEv(null)
    if (!slug) return
    ;(async () => {
      try {
        const data = await fetchEventPublic(slug)
        if (!dead) setEv(data)
      } catch {
        if (!dead) setEv(null)
      }
    })()
    return () => { dead = true }
  }, [slug])

  // 2) вхід у подію (ставить EAT) + первинний heartbeat
  useEffect(() => {
    let cancelled = false
    if (!ev?.id) return

    ;(async () => {
      try {
        // enter — виставляє cookie eat (Path=/api/events/:id/)
        const enter = await userApi.post(
          `/api/events/${ev.id}/enter`,
          {},
          { withCredentials: true }
        )
        if (cancelled) return
        if (enter?.data?.ok !== true) {
          goLogin(enter?.data?.reason || enter?.data?.detail || 'enter_failed')
          return
        }

        // перший heartbeat
        const hb = await userApi.post(
          `/api/events/${ev.id}/heartbeat`,
          {},
          { withCredentials: true }
        )
        if (cancelled) return
        if (hb?.data?.ok !== true) {
          goLogin(hb?.data?.reason || hb?.data?.detail || 'event_token_missing')
          return
        }

        setReady(true)
      } catch (e: any) {
        if (!cancelled) {
          const reason = e?.response?.data?.reason || e?.response?.data?.detail || 'network_error'
          goLogin(reason)
        }
      }
    })()

    return () => { cancelled = true }
  }, [ev?.id])

  // 3) регулярний heartbeat
  useEffect(() => {
    if (!ready || !ev?.id) return

    const sendHb = () => {
      userApi.post(
        `/api/events/${ev.id}/heartbeat`,
        {},
        { withCredentials: true }
      )
        .then((r) => {
          if (r?.data?.ok !== true) {
            const reason = r?.data?.reason || r?.data?.detail || 'heartbeat_denied'
            goLogin(reason)
          }
        })
        .catch((e) => {
          const reason = e?.response?.data?.reason || e?.response?.data?.detail || 'network_error'
          goLogin(reason)
        })
    }

    sendHb()
    hbTimer.current = window.setInterval(sendHb, 10000)
    return () => { if (hbTimer.current) window.clearInterval(hbTimer.current) }
  }, [ready, ev?.id])

  // опційно: при поверненні на вкладку — освіжити EAT та стан
  useEffect(() => {
    if (!ev?.id) return
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        await userApi.post(`/api/events/${ev.id}/enter`, {}, { withCredentials: true })
        await userApi.post(`/api/events/${ev.id}/heartbeat`, {}, { withCredentials: true })
      } catch (e: any) {
        const reason = e?.response?.data?.reason || e?.response?.data?.detail || 'network_error'
        goLogin(reason)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [ev?.id])

  // 4) миттєве завершення сесії через WS: підписка з безпечним реконектом
  // WS для миттєвого логауту
// WS для миттєвого логауту (під /api/ws/client)
useEffect(() => {
  if (!ev?.id) return

  const API_BASE = import.meta.env.VITE_API_BASE || window.location.origin
  const WS_BASE =
    import.meta.env.VITE_WS_BASE ||
    API_BASE.replace(/^http/i, 'ws') // http->ws, https->wss

  if (!WS_BASE) return

  // бек очікує sid у cookie; якщо cookie з бек-хоста доступний — query не потрібен
  const url = `${WS_BASE}/api/ws/client`

  let ws: WebSocket | null = null
  let closed = false
  let reconnectTimer: number | null = null
  let attempt = 0

  const cleanup = () => {
    if (reconnectTimer) { window.clearTimeout(reconnectTimer); reconnectTimer = null }
    if (ws) { try { ws.close() } catch {} ws = null }
  }

  const scheduleReconnect = () => {
    if (closed) return
    const delay = Math.min(1000 * Math.pow(2, attempt++), 10000) // 1s..10s
    reconnectTimer = window.setTimeout(connect, delay)
  }

  const connect = () => {
    try { ws = new WebSocket(url) } catch { scheduleReconnect(); return }

    ws.onopen = () => { attempt = 0 /* ok */ }

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string)
        if (msg?.type === 'terminate' || msg?.type === 'session_logout' || msg?.type === 'admin_logout') {
          // Зупинити плеєр (опційно)
          const vid = document.querySelector('video') as HTMLVideoElement | null
          if (vid) { try { vid.pause() } catch {} }
          // Миттєво на логін
          goLogin('session_invalid')
        }
      } catch {
        // ігнор сміття
      }
    }

    ws.onerror = () => { /* не кидаємо помилки у dev, дочекаємось onclose */ }
    ws.onclose = () => { if (!closed) scheduleReconnect() }
  }

  connect()
  return () => { closed = true; cleanup() }
}, [ev?.id])


  // ——— РЕНДЕР ———
  if (!ev || !ready) {
    return <div className="min-h-screen grid place-items-center">Завантаження події…</div>
  }

  const sandboxUrl = `/custom/event/${ev.id}`

  return (
    <div className="min-h-screen p-4 space-y-6">
      <header className="flex items-center justify-between max-w-5xl mx-auto w-full">
        <h1 className="font-bold text-lg">{ev.title}</h1>
        {/* Лічильник онлайн тепер необов’язковий, але якщо хочеш — додай стейт і зчитуй з heartbeat */}
      </header>

      {ev.player_manifest_url && (
        <video controls playsInline className="w-full max-w-5xl aspect-video bg-black mx-auto">
          <source src={ev.player_manifest_url} type="application/x-mpegURL" />
        </video>
      )}

      {ev.custom_mode === 'sandbox' && (
        <iframe
          src={sandboxUrl}
          className="w-full max-w-5xl mx-auto rounded-xl border"
          style={{ aspectRatio: '16 / 9' }}
          sandbox="allow-scripts"
        />
      )}
    </div>
  )
}
