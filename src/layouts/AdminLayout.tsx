// src/layouts/AdminLayout.tsx
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState, PropsWithChildren } from 'react'
import { useAuth } from '@/state/auth'
import adminApi from '@/api/adminClient'
import { bootstrapAdminAuth, initAdminAuthFromStorage } from '@/api/adminClient'

type ItemProps = {
  to: string
  label: string
  icon: JSX.Element
  collapsed: boolean
}

function NavItem({ to, label, icon, collapsed }: ItemProps) {
  const base = 'group flex items-center gap-2 px-3 py-2 rounded transition-colors hover:bg-slate-100'
  const active = 'bg-slate-900 text-white hover:bg-slate-900'
  return (
    <NavLink
      to={to}
      title={label}
      className={({ isActive }) => (isActive ? `${base} ${active}` : base)}
      end={to === '/admin'}
    >
      <span className="shrink-0">{icon}</span>
      <span className={`truncate ${collapsed ? 'hidden' : 'block'}`}>{label}</span>
    </NavLink>
  )
}

function Icon({ children }: PropsWithChildren) {
  return <span className="inline-flex w-4 h-4 items-center justify-center">{children}</span>
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('admin_sidebar_collapsed') === '1' } catch { return false }
  })
  const [authReady, setAuthReady] = useState(false) // ⬅️ НОВЕ
  const navigate = useNavigate()
  const { user, role, logout } = useAuth() as any

  useEffect(() => {
    try { localStorage.setItem('admin_sidebar_collapsed', collapsed ? '1' : '0') } catch {}
  }, [collapsed])
    // ⬇️ НОВЕ: boot авторизації ДО першого рендера контенту
  useEffect(() => {
    let dead = false
    // 1) підхопити токен з localStorage (миттєво)
    initAdminAuthFromStorage()
    // 2) тихий refresh або підтвердження доступності сесії
    ;(async () => {
      const ok = await bootstrapAdminAuth()
      if (dead) return
      if (!ok) {
        navigate('/admin/login?reason=missing_token', { replace: true })
        return
      }
      setAuthReady(true)
    })()
    return () => { dead = true }
  }, [navigate])

  async function handleLogout() {
    // якщо є бекенд-логінка для адміна — можемо спробувати виклик
    try {
      // якщо ендпойнта немає — помилка ігнорується
      await adminApi.post('/api/admin/logout', {}, { validateStatus: () => true })
    } catch {}
    // локальний логаут зі стейту
    if (typeof logout === 'function') logout()
    navigate('/admin/login', { replace: true })
  }

  const displayEmail = user?.email || 'Admin'
  const displayRole  = (user?.role || role || '').toString()

  if (!authReady) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-slate-500">Перевірка сесії…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      <aside className={`fixed top-0 left-0 h-screen border-r bg-white p-3 transition-[width] duration-200 flex flex-col ${collapsed ? 'w-16' : 'w-56'}`}>
        {/* Шапка сайдбару */}
        <div className="flex items-center justify-between mb-3">
          <div className={`font-semibold text-lg transition-opacity ${collapsed ? 'opacity-0 pointer-events-none w-0' : 'opacity-100'}`}>
            Admin
          </div>
          <button
            title={collapsed ? 'Розгорнути' : 'Згорнути'}
            onClick={() => setCollapsed(v => !v)}
            className="border rounded px-2 py-1 text-sm"
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>

        {/* Навігація */}
        <nav className="space-y-1">
          <NavItem
            to="/admin"
            label="Дашборд"
            collapsed={collapsed}
            icon={
              <Icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 11l9-7 9 7" />
                  <path d="M9 22V12h6v10" />
                </svg>
              </Icon>
            }
          />
          <NavItem
            to="/admin/codes"
            label="Коди"
            collapsed={collapsed}
            icon={
              <Icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="7" cy="17" r="3" />
                  <path d="M10 17h10l-3-3 3-3" />
                </svg>
              </Icon>
            }
          />
          <NavItem
            to="/admin/sessions"
            label="Сесії"
            collapsed={collapsed}
            icon={
              <Icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12H18l-3 7-4-14-3 7H2" />
                </svg>
              </Icon>
            }
          />
          <NavItem
            to="/admin/analytics"
            label="Аналітика"
            collapsed={collapsed}
            icon={
              <Icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18" />
                  <rect x="7" y="10" width="3" height="7" />
                  <rect x="12" y="6" width="3" height="11" />
                  <rect x="17" y="13" width="3" height="4" />
                </svg>
              </Icon>
            }
          />
          <NavItem
            to="/admin/admins"
            label="Адміни"
            collapsed={collapsed}
            icon={
              <Icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </Icon>
            }
          />
        
        <NavLink to="/admin/events" className={({ isActive }) => (isActive ? 'block px-3 py-2 rounded bg-slate-900 text-white' : 'block px-3 py-2 rounded hover:bg-slate-100')}>
          Події
        </NavLink>
      </nav>


        {/* Прокладка щоб профіль завжди був внизу */}
        <div className="flex-1" />

        {/* Блок профілю / logout */}
        <div className={`mt-3 border-t pt-3 ${collapsed ? 'text-center' : ''}`}>
          {!collapsed && (
            <>
              <div className="text-sm font-medium truncate">{displayEmail}</div>
              <div className="text-xs text-slate-500">{displayRole || '—'}</div>
            </>
          )}
          <button
            onClick={handleLogout}
            className={`mt-2 w-full border rounded px-2 py-1 text-sm hover:bg-slate-50 ${collapsed ? '!w-10 !h-10 !p-0 grid place-items-center mx-auto' : ''}`}
            title="Вийти"
          >
            {collapsed ? (
              <Icon>
                {/* power */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v10" />
                  <path d="M5.5 7a7 7 0 1 0 13 0" />
                </svg>
              </Icon>
            ) : (
              'Вийти'
            )}
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-slate-50 ml-16 sm:ml-56 transition-[margin] duration-200">
        <Outlet />
      </main>
    </div>
  )
}
