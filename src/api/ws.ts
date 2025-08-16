// src/ws.ts
export type WSMessage = { type: string; payload?: any }

import axios from 'axios'
import { setAdminAccess } from '@/api/adminClient' // щоб оновити access у памʼяті/LS

// ───────── helpers ─────────

function httpOrigin() {
  return (import.meta.env.VITE_API_BASE?.trim() || window.location.origin).replace(/\/+$/, '')
}
function wsOrigin() {
  const http = httpOrigin()
  // http -> ws, https -> wss
  return http.replace(/^http(s?):/i, (_, s) => (s ? 'wss:' : 'ws:'))
}

function getAdminAccessToken(): string {
  let t = ''
  try { t = localStorage.getItem('admin_access') || '' } catch {}
  return t
}

function expMs(jwt: string | null): number | null {
  if (!jwt) return null
  try {
    const b64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = JSON.parse(atob(b64))
    return typeof json.exp === 'number' ? json.exp * 1000 : null
  } catch { return null }
}

/** Повертає гарантовано свіжий access або null:
 *  - якщо токена нема/майже протух — викликає тихий /api/admin/refresh (cookie admin_refresh має бути з логіну)
 */
async function ensureFreshAccess(): Promise<string | null> {
  let token: string | null = null
  try { token = localStorage.getItem('admin_access') } catch {}
  const e = expMs(token)
  const needsRefresh = !token || !e || (e - Date.now() < 10_000)

  if (!needsRefresh) return token

  try {
    const BASE = httpOrigin()
    const r = await axios.post(`${BASE}/api/admin/refresh`, {}, { withCredentials: true })
    const fresh = r.data?.access_token || null
    if (fresh) setAdminAccess(fresh)
    return fresh
  } catch {
    return null
  }
}

// ───────── admin WS з авто-рефрешем і реконектом ─────────

/** Адмінський WS:
 *  - перед конектом тихо оновлює access за потреби
 *  - додає ?token=... у query
 *  - авто-реконект із backoff
 *  - якщо сервер закрив з 4401/4403 — пробує refresh і негайний реконект
 *
 * Повертає обʼєкт, сумісний з WebSocket (можна призначати onmessage/onopen/...).
 */
export function adminWS(): WebSocket {
  const WS_BASE = (import.meta.env.VITE_WS_BASE?.trim() || wsOrigin()).replace(/\/+$/, '')

  let ws: WebSocket | null = null
  let closed = false
  let reconnectTimer: number | null = null
  let attempt = 0

  // збережені обробники, щоб не губилися між реконектами
  let _onopen: ((ev: Event) => any) | null = null
  let _onmessage: ((ev: MessageEvent) => any) | null = null
  let _onerror: ((ev: Event) => any) | null = null
  let _onclose: ((ev: CloseEvent) => any) | null = null

  const applyHandlers = () => {
    if (!ws) return
    ws.onopen = (ev) => { attempt = 0; _onopen?.(ev) }
    ws.onmessage = (ev) => { _onmessage?.(ev) }
    ws.onerror = (ev) => { _onerror?.(ev) }
    ws.onclose = async (ev) => {
      _onclose?.(ev)
      if (closed) return
      // 4401/4403: токен не підійшов → спробуємо refresh один раз негайно
      if (ev.code === 4401 || ev.code === 4403) {
        const t = await ensureFreshAccess()
        if (t) { connect(); return }
      }
      scheduleReconnect()
    }
  }

  const scheduleReconnect = () => {
    if (closed) return
    const delay = Math.min(1000 * Math.pow(2, attempt++), 10_000) // 1s..10s
    reconnectTimer = window.setTimeout(connect, delay)
  }

  const connect = async () => {
    const token = await ensureFreshAccess()
    if (!token) {
      // нема валідного токена — не підключаємось
      return
    }
    try {
      ws = new WebSocket(`${WS_BASE}/api/ws/admin?token=${encodeURIComponent(token)}`)
      applyHandlers()
    } catch {
      scheduleReconnect()
    }
  }

  connect()

  // Повертаємо “обгортку”, сумісну з WebSocket API (як у твоєму коді)
  const wrapper = {
    get readyState() { return ws ? ws.readyState : WebSocket.CLOSED },
    close: () => {
      closed = true
      if (reconnectTimer) { window.clearTimeout(reconnectTimer); reconnectTimer = null }
      if (ws) { try { ws.close() } catch {} ws = null }
    },
    send: (data: any) => { if (ws && ws.readyState === WebSocket.OPEN) ws.send(data) },
    set onopen(h: ((ev: Event) => any) | null)    { _onopen = h; if (ws) ws.onopen = h as any },
    set onmessage(h: ((ev: MessageEvent) => any) | null) { _onmessage = h; if (ws) ws.onmessage = h as any },
    set onerror(h: ((ev: Event) => any) | null)   { _onerror = h; if (ws) ws.onerror = h as any },
    set onclose(h: ((ev: CloseEvent) => any) | null) { _onclose = h; if (ws) ws.onclose = h as any },
  } as unknown as WebSocket

  return wrapper
}

// ───────── універсальний конектор (за потреби) ─────────

/** Загальний WS-конектор для інших шляхів.
 *  Якщо opts.withAdminToken = true — додає свіжий ?token=... (із тихим refresh).
 *  Має такий самий реконект/поведінку, як adminWS().
 */
export function connectWS(
  path: string,
  onMessage?: (msg: WSMessage) => void,
  opts?: { withAdminToken?: boolean }
) {
  const WS_BASE = (import.meta.env.VITE_WS_BASE?.trim() || wsOrigin()).replace(/\/+$/, '')

  let ws: WebSocket | null = null
  let closed = false
  let reconnectTimer: number | null = null
  let attempt = 0

  let _onopen: ((ev: Event) => any) | null = null
  let _onerror: ((ev: Event) => any) | null = null
  let _onclose: ((ev: CloseEvent) => any) | null = null

  const scheduleReconnect = () => {
    if (closed) return
    const delay = Math.min(1000 * Math.pow(2, attempt++), 10_000)
    reconnectTimer = window.setTimeout(connect, delay)
  }

  const connect = async () => {
    // будуємо URL
    const url = new URL(path, WS_BASE)
    if (opts?.withAdminToken) {
      const token = await ensureFreshAccess()
      if (!token) return
      url.searchParams.set('token', token)
    }

    try {
      ws = new WebSocket(url.toString())
    } catch {
      scheduleReconnect(); return
    }

    ws.onopen = (ev) => { attempt = 0; _onopen?.(ev) }
    ws.onmessage = (ev) => {
      try { onMessage?.(JSON.parse(ev.data as any)) } catch { /* ignore non-JSON */ }
    }
    ws.onerror = (ev) => { _onerror?.(ev) }
    ws.onclose = async (ev) => {
      _onclose?.(ev)
      if (closed) return
      if (ev.code === 4401 || ev.code === 4403) {
        // пробуємо оновити токен і підʼєднатись знов
        const t = await ensureFreshAccess()
        if (t) { connect(); return }
      }
      scheduleReconnect()
    }
  }

  connect()

  return {
    get readyState() { return ws ? ws.readyState : WebSocket.CLOSED },
    close: () => {
      closed = true
      if (reconnectTimer) { window.clearTimeout(reconnectTimer); reconnectTimer = null }
      if (ws) { try { ws.close() } catch {} ws = null }
    },
    send: (data: any) => { if (ws && ws.readyState === WebSocket.OPEN) ws.send(data) },
    set onopen(h: ((ev: Event) => any) | null)    { _onopen = h; if (ws) ws.onopen = h as any },
    set onerror(h: ((ev: Event) => any) | null)   { _onerror = h; if (ws) ws.onerror = h as any },
    set onclose(h: ((ev: CloseEvent) => any) | null) { _onclose = h; if (ws) ws.onclose = h as any },
  } as unknown as WebSocket
}
