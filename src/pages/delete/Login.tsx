import { useState } from 'react'
import userApi from '@/api/userClient'
import { useAuth } from '@/state/auth'

export default function Login() {
  const [code, setCode] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const setAuth = useAuth(s => s.setAuth)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    try {
      const { data } = await userApi.post('/api/auth/login_by_code', { code })
      setAuth({ isAuthenticated: true, access: data.access, refresh: data.refresh, sessionId: data.session_id, role: 'admin' })
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? 'Помилка логіну')
    }
  }

  return (
    <div className="min-h-screen grid place-items-center">
      <form onSubmit={submit} className="bg-white p-6 rounded-xl shadow w-80 space-y-3">
        <h1 className="text-xl font-semibold">Вхід за кодом</h1>
        <input value={code} onChange={e => setCode(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Введіть код" />
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <button className="w-full bg-slate-900 text-white rounded py-2">Увійти</button>
      </form>
    </div>
  )
}
