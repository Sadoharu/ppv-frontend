//done
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAdminLogin } from '@/features/auth/hooks/useAdminLogin'
import LoginForm from '@/features/auth/components/LoginForm'
import ReasonBanner from '@/features/auth/components/ReasonBanner'

export default function AdminLoginPage() {
  const { login, loading, error } = useAdminLogin()
  const navigate = useNavigate()
  const location = useLocation() as any
  const [params] = useSearchParams()
  const reason = params.get('reason')

  async function handleSubmit(email: string, password: string) {
    try {
      await login(email, password)
      const target = location?.state?.from?.pathname || '/admin'
      navigate(target, { replace: true })
    } catch {
      // помилка вже виставлена в хуку
    }
  }

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="space-y-3">
        <ReasonBanner reason={reason} err={error ?? undefined} />
        <LoginForm onSubmit={handleSubmit} loading={loading} error={null} />
      </div>
    </div>
  )
}
