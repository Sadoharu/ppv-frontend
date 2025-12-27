// src/features/auth/components/LoginForm.tsx
//done
import { useState } from 'react'

type Props = {
  onSubmit: (email: string, password: string) => void | Promise<void>
  loading?: boolean
  error?: string | null
  defaultEmail?: string
  defaultPassword?: string
}

export default function LoginForm({
  onSubmit,
  loading,
  error,
  defaultEmail = '',
  defaultPassword = '',
}: Props) {
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState(defaultPassword)
  const [showPw, setShowPw] = useState(false)

  return (
    <form
      onSubmit={async (e) => { e.preventDefault(); await onSubmit(email, password) }}
      className="bg-white p-6 rounded-xl shadow w-[420px] space-y-3"
    >
      <h1 className="text-xl font-semibold">Адмін-вхід</h1>

      <div className="space-y-2">
        <label className="block text-sm">Email</label>
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2"
          type="email"
          autoFocus
          autoComplete="username"
          placeholder="admin@example.com"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm">Пароль</label>
        <div className="flex gap-2">
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
            type={showPw ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPw(s => !s)}
            className="border rounded px-3"
          >
            {showPw ? 'Приховати' : 'Показати'}
          </button>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <button
        disabled={loading}
        className="w-full bg-slate-900 text-white rounded py-2 disabled:opacity-60"
      >
        {loading ? 'Вхід…' : 'Увійти'}
      </button>
    </form>
  )
}
