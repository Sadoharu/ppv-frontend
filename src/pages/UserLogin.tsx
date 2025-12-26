// src/pages/UserLogin.tsx
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import userApi from '@/api/userClient' // withCredentials: true
import { fetchEventCard, type EventCard } from '@/api/publicClient'

const reasonMap: Record<string, string> = {
  event_token_missing: 'Потрібно підтвердити доступ до цієї події.',
  event_token_mismatch: 'Потрібно підтвердити доступ до цієї події.',
  event_token_expired: 'Час доступу вичерпано. Увійдіть знову.',
  event_token_invalid: 'Недійсний токен доступу. Увійдіть знову.',
  event_token_wrong_type: 'Недійсний токен доступу. Увійдіть знову.',
  not_allowed: 'Цей код не має доступу до цієї події.',
  event_switch_forbidden: 'Для цієї події потрібно підтвердити доступ окремо.',
  event_id_required: 'Потрібно підтвердити доступ до цієї події.',
  session_invalid: 'Сесія недійсна. Увійдіть знову.',
  code_invalid: 'Код недійсний. Спробуйте ще раз.',
  heartbeat_denied: 'Доступ потребує повторного підтвердження.',
  enter_failed: 'Не вдалося підтвердити доступ. Спробуйте ще раз.',
  network_error: 'Проблема з мережею. Спробуйте ще раз.',
}

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

// /events/:slug або /p/:slug → slug
function getSlugFromRedirect(redirect: string | null): string | null {
  if (!redirect) return null
  const path = redirect.split('?')[0]
  const m = path.match(/^\/(?:events|p)\/([^\/\?\#]+)\b/i)
  return m?.[1] ?? null
}

function resolveTargetUrl(slug: string | null, ev: EventCard | null, redirect: string) {
  // якщо бек повертає точний page_url — використовуємо його
  const pageUrl = (ev as any)?.page_url as string | undefined
  if (pageUrl) return pageUrl
  if (slug) return `/p/${encodeURIComponent(slug)}`
  // якщо redirect вже веде на /p/* — можна піти туди
  if (/^\/p\//i.test(redirect)) return redirect
  // fallback — на каталог
  return '/'
}

export default function UserLogin() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const q = useQuery()
  const redirect = q.get('redirect') || '/'
  const reasonKey = q.get('reason') || ''
  const slug = useMemo(() => getSlugFromRedirect(redirect), [redirect])

  const [eventInfo, setEventInfo] = useState<EventCard | null>(null)

  // Підтягнути картку події (для відображення назви + отримати id/page_url)
  useEffect(() => {
    let dead = false
    if (!slug) { setEventInfo(null); return }
    ;(async () => {
      try {
        const data = await fetchEventCard(slug) // GET /api/events/:slug
        if (!dead) setEventInfo(data)
      } catch {
        if (!dead) setEventInfo(null)
      }
    })()
    return () => { dead = true }
  }, [slug])

  const bannerText = useMemo(() => {
    if (!reasonKey) return null
    return reasonMap[reasonKey] ?? 'Потрібно підтвердити доступ до цієї події.'
  }, [reasonKey])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const val = code.trim()
    if (!val) return
    setErr(null)
    setLoading(true)
    try {
      const payload: any = { code: val }
      if (eventInfo?.id) payload.event_id = eventInfo.id

      await userApi.post('/api/auth/login_by_code', payload, { withCredentials: true })

      // Ключове: повний перехід на серверну сторінку (щоб підвантажився PPV runtime)
      const target = resolveTargetUrl(slug, eventInfo, redirect)
      window.location.assign(target)
    } catch (e: any) {
      const detail = e?.response?.data?.detail
      if (detail === 'Code disabled or expired') {
        setErr('Код вимкнено або строк дії минув')
      } else if (detail === 'Invalid or inactive code') {
        setErr('Код недійсний або неактивний')
      } else if (detail === 'not_allowed') {
        setErr('Цей код не має доступу до цієї події')
      } else {
        setErr(detail || 'Код не прийнято')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-4">
      <form onSubmit={submit} className="bg-white p-6 rounded-xl shadow w-full max-w-md space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold">
            {eventInfo ? `Доступ до: «${eventInfo.title}»` : 'Вхід за кодом'}
          </h1>
          {slug && <div className="text-xs opacity-60">/p/{slug}</div>}
        </div>

        {bannerText && (
          <div className="rounded-lg border p-3 bg-amber-50 border-amber-200 text-amber-900 text-sm">
            {bannerText}
          </div>
        )}

        {err && (
          <div className="rounded-lg border p-3 bg-red-50 border-red-200 text-red-800 text-sm">
            {err}
          </div>
        )}

        <label className="block">
          <span className="text-sm">Код доступу</span>
          <input
            value={code}
            onChange={e => setCode(e.target.value)}
            className="mt-1 w-full border-2 border-black rounded px-3 py-2 font-mono"
            placeholder="Введіть код"
            autoFocus
          />
        </label>

        <button
          disabled={loading || !code.trim()}
          className="w-full bg-black text-white rounded py-2 font-semibold disabled:opacity-50"
        >
          {loading ? 'Вхід…' : 'Підтвердити доступ'}
        </button>

        <p className="text-xs opacity-60 text-center">
          Після успішного входу ви перейдете на сторінку події.
        </p>
      </form>
    </div>
  )
}
