import { useEffect, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import { fetchCustomBlocks, type CustomBlocksResp } from '@/api/customBlocks'

type Props = {
  eventId: number
  preview?: boolean
  adminAccessToken?: string
  pollMs?: number          // опційно: авто-оновлення, напр. 15_000
  allowJs?: boolean        // за замовчуванням false; вмикай тільки якщо довіряєш контенту
}

// Внутрішній кеш ETag (на сесію)
const etagCache = new Map<number, string | null>()

export default function CustomBlocks({ eventId, preview, adminAccessToken, pollMs, allowJs = false }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const shadowRef = useRef<ShadowRoot | null>(null)
  const [blocks, setBlocks] = useState<CustomBlocksResp | null>(null)
  const [loading, setLoading] = useState(false)
  const etagRef = useRef<string | null>(etagCache.get(eventId) ?? null)

  async function loadOnce() {
    if (!eventId) return
    setLoading(true)
    try {
      const { data, etag, notModified } = await fetchCustomBlocks(eventId, {
        preview,
        adminAccessToken,
        etag: etagRef.current || null,
      })
      if (notModified) return
      if (etag !== null) {
        etagRef.current = etag
        etagCache.set(eventId, etag)
      }
      if (data) setBlocks(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOnce()
    if (!pollMs) return
    const t = window.setInterval(loadOnce, pollMs)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, preview, adminAccessToken, pollMs])

  // ініціалізація ShadowRoot
  useEffect(() => {
    if (!hostRef.current) return
    if (!shadowRef.current) {
      shadowRef.current = hostRef.current.attachShadow({ mode: 'open' })
    }
  }, [])

  // рендер у ShadowRoot
  useEffect(() => {
    const shadow = shadowRef.current
    if (!shadow) return
    // очистити попередній вміст
    while (shadow.firstChild) shadow.removeChild(shadow.firstChild)

    if (!blocks || blocks.mode === 'none') return

    // <style> з CSS
    if (blocks.css && blocks.css.trim()) {
      const styleEl = document.createElement('style')
      styleEl.textContent = blocks.css
      shadow.appendChild(styleEl)
    }

    // контейнер для HTML
    const wrap = document.createElement('div')
    // санітизація HTML (дозволь інлайн-стилі, якщо треба)
    const cleanHtml = DOMPurify.sanitize(blocks.html, {
      ALLOWED_ATTR: false, // дефолт
      ALLOW_UNKNOWN_PROTOCOLS: false,
    })
    wrap.innerHTML = cleanHtml
    shadow.appendChild(wrap)

    // виконання JS (опційно, небезпечно без повної пісочниці)
    if (allowJs && blocks.js && blocks.js.trim() && blocks.mode === 'html') {
      try {
        // надаємо обмежений API у кастомний код
        const api = {
          // точка монтування, обмежена ShadowRoot’ом
          root: shadow,
          container: wrap,
          // простий pub/sub або будь-які безпечні хуки твоєї SPA
          log: (...args: any[]) => console.log('[custom]', ...args),
        }
        // eslint-disable-next-line no-new-func
        const runner = new Function('root', 'container', 'api', `"use strict";\n${blocks.js}`)
        runner(shadow, wrap, api)
      } catch (e) {
        console.error('custom js failed:', e)
      }
    }
  }, [blocks, allowJs])

  if (!blocks || blocks.mode === 'none') {
    return null
  }
  // (опційно) індикатор підвантаження
  return (
    <div className="max-w-5xl mx-auto w-full">
      {loading && <div className="text-xs text-slate-500 mb-1">Оновлення кастом-контенту…</div>}
      <div ref={hostRef} />
    </div>
  )
}
