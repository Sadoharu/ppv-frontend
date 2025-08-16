//done
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import adminApi from '@/api/adminClient'
import { adminWS } from '@/api/ws'
import type { ListResponse, SessionRow } from '@/types/sessions'
import useDebouncedValue from '@/hooks/useDebouncedValue'

export function useSessions() {
  const [items, setItems] = useState<SessionRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const [q, setQ] = useState('')
  const [onlyActive, setOnlyActive] = useState(true)
  const [onlyConnected, setOnlyConnected] = useState(false)
  const debouncedQ = useDebouncedValue(q, 300)

  // для швидких локальних апдейтів
  const itemsRef = useRef<SessionRow[]>([])
  itemsRef.current = items

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = { limit: 200 }
      if (debouncedQ.trim()) params.q = debouncedQ.trim()
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
  }, [debouncedQ, onlyActive])

  // перше завантаження + оновлення при зміні фільтрів/пошуку
  useEffect(() => { load() }, [load, onlyConnected])

  // апдейт/вставка елемента по id
  const upsert = useCallback((row: Partial<SessionRow> & { id: string }) => {
    setItems(prev => {
      const idx = prev.findIndex(x => x.id === row.id)
      if (idx === -1) return [row as SessionRow, ...prev]
      const merged = { ...prev[idx], ...row }
      const copy = prev.slice()
      copy[idx] = merged
      return copy
    })
  }, [])

  // видалити елемент
  const drop = useCallback((id: string) => {
    setItems(prev => prev.filter(x => x.id !== id))
  }, [])

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
  }, [upsert, drop])

  // локальний view (миттєві фільтри)
  const view = useMemo(() => {
    let arr = items
    if (onlyActive) arr = arr.filter(x => x.active)
    if (onlyConnected) arr = arr.filter(x => x.online === true)
    return arr
  }, [items, onlyActive, onlyConnected])

  return {
    items, total, loading,
    q, setQ,
    onlyActive, setOnlyActive,
    onlyConnected, setOnlyConnected,
    view, load,
    upsert, drop,
  }
}
