import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/state/auth'
import api from '@/api/adminClient'
import { setAdminAccess } from '@/api/adminClient' // ⬅️ додали

export default function AdminLogin() {
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const setAuth = useAuth(s => s.setAuth)
  const navigate = useNavigate()
  const loc = useLocation() as any

  // дружні повідомлення з query (?reason=...)
  useEffect(() => {
    const params = new URLSearchParams(loc.search)
    const reason = params.get('reason')
    if (reason === 'token_expired') setErr('Сесія завершена. Увійдіть знову.')
    else if (reason === 'token_invalid') setErr('Недійсна сесія. Увійдіть знову.')
    else if (reason === 'missing_token') setErr('Потрібно увійти для доступу до адмінки.')
  }, [loc.search])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setLoading(true)
    try {
      // ВАЖЛИВО: дозволяємо ставити refresh-куку (HttpOnly)
      const { data } = await api.post(
        '/api/admin/login',
        { email, password },
        { withCredentials: true }               // ⬅️ критично для тихого refresh
      )

      const token = data.access_token || data.access || ''
      if (!token) throw new Error('Token missing in response')

      // 1) зберігаємо access для інтерцепторів і таймера автологауту
      setAdminAccess(token)                     // ⬅️ ключовий виклик

      // 2) синхронізуємо твій Zustand-стор (якщо він потрібен для UI)
      setAuth({ isAuthenticated: true, access: token, role: data.role ?? 'admin' })

      // 3) редірект після логіну
      const target = loc?.state?.from?.pathname || '/admin'
      navigate(target, { replace: true })
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || 'Помилка входу')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center">
      <form onSubmit={submit} className="bg-white p-6 rounded-xl shadow w-[420px] space-y-3">
        <h1 className="text-xl font-semibold">Адмін-вхід</h1>
        <div className="space-y-2">
          <label className="block text-sm">Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)}
                 className="w-full border rounded px-3 py-2" type="email" autoFocus />
        </div>
        <div className="space-y-2">
          <label className="block text-sm">Пароль</label>
          <input value={password} onChange={e=>setPassword(e.target.value)}
                 className="w-full border rounded px-3 py-2" type="password" />
        </div>
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <button disabled={loading} className="w-full bg-slate-900 text-white rounded py-2">
          {loading ? 'Вхід...' : 'Увійти'}
        </button>
      </form>
    </div>
  )
}
