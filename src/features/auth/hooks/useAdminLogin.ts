// src/features/auth/hooks/useAdminLogin.ts
//done
import { useCallback, useState } from 'react'
import api, { setAdminAccess } from '@/api/adminClient'
import { useAuth } from '@/state/auth'

export function useAdminLogin() {
  const setAuth = useAuth(s => s.setAuth)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post(
        '/api/admin/login',
        { email, password },
        { withCredentials: true } // важливо для httpOnly refresh
      )

      const token: string = data.access_token || data.access || ''
      if (!token) throw new Error('Token missing in response')

      // зберігаємо access для інтерцепторів/авто-рефрешу
      setAdminAccess(token)
      // синхронізуємо глобальний стейт (для UI/ролей)
      setAuth({ isAuthenticated: true, access: token, role: data.role ?? 'admin' })

      return { token, role: (data.role ?? 'admin') as string }
    } catch (e: any) {
      const detail = e?.response?.data?.detail || e?.message || 'Помилка входу'
      setError(detail)
      throw new Error(detail)
    } finally {
      setLoading(false)
    }
  }, [setAuth])

  return { login, loading, error, setError }
}
