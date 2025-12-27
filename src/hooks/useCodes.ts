// src/hooks/useCodes.ts
//done
import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchCodes as apiFetchCodes } from '@/api/admin'
import type { CodeRow } from '@/types/codes'
import useDebouncedValue from './useDebouncedValue'

export function useCodes(initialLimit = 100) {
  const [items, setItems] = useState<CodeRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [offset, setOffset] = useState(0)
  const [limit] = useState(initialLimit)

  const debouncedQ = useDebouncedValue(q, 300)

  const idsInView = useMemo(() => items.map(i => i.id), [items])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    let cancelled = false
    try {
      const { total, items } = await apiFetchCodes({ limit, offset, q: debouncedQ || undefined })
      if (!cancelled) {
        setTotal(total)
        setItems(items)
      }
    } catch (e: any) {
      if (!cancelled) setError(e?.response?.data?.detail || 'Не вдалося завантажити коди')
    } finally {
      if (!cancelled) setLoading(false)
    }
    return () => { cancelled = true }
  }, [limit, offset, debouncedQ])

  useEffect(() => { load() }, [load])

  // при зміні q — скидати пагінацію на першу сторінку
  useEffect(() => { setOffset(0) }, [debouncedQ])

  return { items, total, loading, error, q, setQ, offset, setOffset, limit, load, idsInView, setItems, setTotal }
}