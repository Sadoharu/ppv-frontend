// src/pages/LoginPage.tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import userApi from '@/api/userClient'
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

function getSlugFromRedirect(redirect: string | null): string | null {
  if (!redirect) return null
  // підтримуємо як /events/<slug>, так і /p/<slug>
  const path = redirect.split('?')[0]
  const m = path.match(/^\/(?:events|p)\/([^\/\?\#]+)\b/i)
  return m?.[1] ?? null
}

export default function LoginPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const redirect = params.get('redirect') || '/'
  const reasonKey = params.get('reason') || ''
  const slug = useMemo(() => getSlugFromRedirect(redirect), [redirect])

  const [eventInfo, setEventInfo] = useState<EventCard | null>(null)
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [serverMsg, setServerMsg] = useState<string | null>(null)

  // Підвантажуємо назву події за slug (якщо є)
  useEffect(() => {
    let dead = false
    if (!slug) { setEventInfo(null); return }
    ;(async () => {
      try {
        const data = await fetchEventCard(slug)
        if (!dead) setEventInfo(data)
      } catch {
        if (!dead) setEventInfo(null)
      }
    })()
    return () => { dead = true }
  }, [slug])

  // Формуємо повідомлення для банера зверху
  const bannerText = useMemo(() => {
    if (!reasonKey) return null
    return reasonMap[reasonKey] ?? 'Потрібно підтвердити доступ до цієї події.'
  }, [reasonKey])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setServerMsg(null)
    try {
      // ваш бек: /login (збережено як було)
      const res = await userApi.post('/login', { code }, { withCredentials: true })
      if (res.status >= 200 && res.status < 300) {
        navigate(redirect)
      } else {
        setServerMsg('Не вдалося увійти. Спробуйте ще раз.')
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      if (detail === 'Code disabled or expired') {
        setServerMsg('Код вимкнено або строк його дії вичерпано.')
      } else if (detail === 'Invalid or inactive code') {
        setServerMsg('Код недійсний або неактивний.')
      } else if (detail === 'not_allowed') {
        setServerMsg('Цей код не має доступу до цієї події.')
      } else {
        setServerMsg(detail || 'Сталася помилка. Спробуйте ще раз.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Заголовок із назвою події */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">
            {eventInfo ? `Доступ до: «${eventInfo.title}»` : 'Вхід до події'}
          </h1>
          {slug && <div className="text-sm opacity-70 mt-1">/p/{slug}</div>}
        </div>

        {/* Інфо-банер */}
        {bannerText && (
          <div className="rounded-lg border p-3 bg-amber-50 border-amber-200 text-amber-900">
            {bannerText}
          </div>
        )}

        {/* Помилка логіну */}
        {serverMsg && (
          <div className="rounded-lg border p-3 bg-red-50 border-red-200 text-red-800">
            {serverMsg}
          </div>
        )}

        {/* Форма вводу коду */}
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="text-sm">Код доступу</span>
            <input
              type="text"
              inputMode="text"
              autoComplete="one-time-code"
              className="mt-1 w-full rounded-lg border-2 border-black px-3 py-2 font-mono"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Введіть код…"
              required
            />
          </label>

          <button
            type="submit"
            disabled={submitting || !code}
            className="w-full rounded-lg bg-black text-white py-2 font-semibold disabled:opacity-60"
          >
            {submitting ? 'Виконується…' : 'Підтвердити доступ'}
          </button>
        </form>

        <p className="text-xs opacity-60 text-center">
          Після успішного входу ви автоматично перейдете до сторінки події.
        </p>
      </div>
    </div>
  )
}
