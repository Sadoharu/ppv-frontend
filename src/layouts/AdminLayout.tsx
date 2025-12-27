// src/layouts/AdminLayout.tsx
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState, useMemo, PropsWithChildren } from 'react'
import { useAuth, Role } from '@/state/auth'
import adminApi, { bootstrapAdminAuth, initAdminAuthFromStorage } from '@/api/adminClient'
import { fetchMe } from '@/api/admin'
import { adminWS } from '@/api/ws'

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
      className={({ isActive }) => (isActive ? `${base} ${active}` : `${base}`)}
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

// Fallback JWT parser
function parseJwtUserData(token: string): { email?: string, sub?: string } | undefined {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))
    const payload = JSON.parse(jsonPayload)
    
    const email = payload.email || payload.preferred_username || (payload.sub && payload.sub.includes('@') ? payload.sub : undefined)
    const sub = payload.sub
    
    return { email, sub }
  } catch (e) {
    return undefined
  }
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('admin_sidebar_collapsed') === '1' } catch { return false }
  })
  const [authReady, setAuthReady] = useState(false)
  const navigate = useNavigate()
  
  // Додаємо name у деструктуризацію
  const { access, email, name, role, logout, setAuth } = useAuth() 

  useEffect(() => {
    try { localStorage.setItem('admin_sidebar_collapsed', collapsed ? '1' : '0') } catch {}
  }, [collapsed])

  // 1. Boot авторизації
  useEffect(() => {
    let dead = false
    initAdminAuthFromStorage()
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

  // 2. Fetch Profile from /api/v1/admin/me
  useEffect(() => {
    if (!authReady || !access) return

    const getProfile = async () => {
      try {
        const user = await fetchMe()
        if (user) {
           setAuth({ 
             email: user.email, 
             role: user.role as Role,
             name: user.name || undefined
           })
           return 
        }
      } catch (e) {
        // Якщо 404/500, ігноруємо
      }

      // Fallback: спроба витягнути хоча б email з токена
      if (!email) {
        const userData = parseJwtUserData(access)
        if (userData?.email) {
          setAuth({ email: userData.email })
        }
      }
    }

    getProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, access, setAuth]) 

  // 3. WS connection
  useEffect(() => {
    if (!authReady) return
    const ws = adminWS()
    
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        if (msg.type === 'welcome') {
           const updates: any = {}
           if (msg.role) updates.role = msg.role as Role
           if (msg.user_id) { /* можна зберегти id */ }
           
           if (Object.keys(updates).length > 0) setAuth(updates)
        }
      } catch {}
    }

    return () => ws.close()
  }, [authReady, setAuth])

  async function handleLogout() {
    try {
      await adminApi.post('/api/admin/logout', {}, { validateStatus: () => true })
    } catch {}
    logout()
    navigate('/admin/login', { replace: true })
  }

  // === UI DISPLAY VARIABLES ===
  
  // Якщо є Name, показуємо його. Якщо немає - Email. Якщо немає - "Admin #ID".
  const displayName = useMemo(() => {
    if (name) return name
    if (email) return email
    return 'Admin'
  }, [name, email])

  const displayRole = useMemo(() => {
    if (!role) return ''
    return role.charAt(0).toUpperCase() + role.slice(1)
  }, [role])
  
  // === RBAC VISIBILITY LOGIC ===
  // super: All
  // admin: All except 'Admins'
  // manager: Events, Codes (Content)
  // support: Codes, Sessions (Support)
  // analyst: Analytics only
  
  const r = role as Role
  const isSuper = r === 'super'
  
  const showAdmins    = isSuper
  const showEvents    = ['super', 'admin', 'manager'].includes(r)
  const showCodes     = ['super', 'admin', 'manager', 'support'].includes(r)
  const showSessions  = ['super', 'admin', 'support'].includes(r)
  const showAnalytics = ['super', 'admin', 'analyst'].includes(r)

  if (!authReady) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-slate-500">Перевірка сесії…</div>
      </div>
    )
  }

  const mainMargin = collapsed ? 'ml-16' : 'ml-56'

  return (
    <div className="min-h-screen flex">
      <aside className={`fixed top-0 left-0 h-screen border-r bg-white p-3 transition-[width] duration-200 flex flex-col ${collapsed ? 'w-16' : 'w-56'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className={`font-semibold text-lg transition-opacity ${collapsed ? 'opacity-0 pointer-events-none w-0' : 'opacity-100'}`}>
            Admin <span className="text-xs font-normal text-slate-400">v1</span>
          </div>
          <button
            onClick={() => setCollapsed(v => !v)}
            className="border rounded px-2 py-1 text-sm"
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>

        <nav className="space-y-1">
          <NavItem
            to="/admin"
            label="Дашборд"
            collapsed={collapsed}
            icon={<Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 11l9-7 9 7" /><path d="M9 22V12h6v10" /></svg></Icon>}
          />
          
          {showCodes && (
            <NavItem
              to="/admin/codes"
              label="Коди"
              collapsed={collapsed}
              icon={<Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="17" r="3" /><path d="M10 17h10l-3-3 3-3" /></svg></Icon>}
            />
          )}

          {showSessions && (
            <NavItem
              to="/admin/sessions"
              label="Сесії"
              collapsed={collapsed}
              icon={<Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12H18l-3 7-4-14-3 7H2" /></svg></Icon>}
            />
          )}

          {showEvents && (
            <NavItem
              to="/admin/events"
              label="Події"
              collapsed={collapsed}
              icon={<Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg></Icon>}
            />
          )}

          {showAnalytics && (
            <NavItem
              to="/admin/analytics"
              label="Аналітика"
              collapsed={collapsed}
              icon={<Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><rect x="7" y="10" width="3" height="7" /><rect x="12" y="6" width="3" height="11" /><rect x="17" y="13" width="3" height="4" /></svg></Icon>}
            />
          )}
          
          {showAdmins && (
            <NavItem
              to="/admin/admins"
              label="Адміни"
              collapsed={collapsed}
              icon={<Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg></Icon>}
            />
          )}
        </nav>

        <div className="flex-1" />

        <div className={`mt-3 border-t pt-3 ${collapsed ? 'text-center' : ''}`}>
          {!collapsed && (
            <>
              <div className="text-sm font-medium truncate" title={displayName}>{displayName}</div>
              <div className="text-xs text-slate-500 uppercase font-bold">{displayRole}</div>
            </>
          )}
          <button
            onClick={handleLogout}
            className={`mt-2 w-full border rounded px-2 py-1 text-sm hover:bg-slate-50 ${collapsed ? '!w-10 !h-10 !p-0 grid place-items-center mx-auto' : ''}`}
            title="Вийти"
          >
             {collapsed ? <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v10" /><path d="M5.5 7a7 7 0 1 0 13 0" /></svg></Icon> : 'Вийти'}
          </button>
        </div>
      </aside>

      <main className={`flex-1 bg-slate-50 ${mainMargin} transition-[margin] duration-200`}>
        <Outlet />
      </main>
    </div>
  )
}