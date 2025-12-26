// src/App.tsx
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

import Dashboard from './pages/Dashboard'
import Sessions from './pages/admin/SessionsPage'
import Analytics from './pages/Analytics'
import Admins from './pages/Admins'
import AdminLogin from './pages/admin/AdminLoginPage'
import EventsList from '@/pages/admin/EventsList'
import EventEdit from '@/pages/admin/EventEdit'
import EventsGrid from '@/pages/EventsGrid'
import EventWatch from '@/pages/EventWatch' // редирект на /p/:slug (залишаємо для зворотної сумісності)
import UserLogin from '@/pages/UserLogin'
import CodesPage from '@/pages/admin/CodesPage'
import AdminLayout from '@/layouts/AdminLayout'
import { useAuth } from './state/auth'
import PageEditor from '@/pages/admin/PageEditor'

// Пас-тру компонент: передаємо керування бекенду (повна перезагрузка сторінки)
function ServerPagePassThrough() {
  const loc = useLocation()
  useEffect(() => {
    // Відкриваємо серверну сторінку 1:1 (з урахуванням query/hash)
    window.location.replace(loc.pathname + loc.search + loc.hash)
  }, [loc])
  return <div className="min-h-screen grid place-items-center text-sm text-slate-500">Відкриваємо серверну сторінку…</div>
}

function Guard({ children, roles }: { children: JSX.Element; roles?: string[] }) {
  const { isAuthenticated, role } = useAuth()
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />

  const norm = (s?: string) => (s ?? '').toLowerCase()
  const userRole = norm(role)
  const required = (roles ?? []).map(norm)

  if (userRole === 'super') return children
  if (required.length === 0) return children
  if (required.includes(userRole)) return children
  return <Navigate to="/admin" replace />
}

export default function App() {
  return (
    <Routes>
      {/* ПУБЛІЧНА ЧАСТИНА */}
      <Route path="/" element={<EventsGrid />} />
      <Route path="/events" element={<EventsGrid />} />

      {/* Зворотна сумісність: старий шлях перегляду події через SPA -> редирект на /p/:slug */}
      <Route path="/events/:slug" element={<EventWatch />} />


      <Route path="/login" element={<UserLogin />} />

      {/* АДМІН АВТЕНТИФІКАЦІЯ */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* АДМІНКА З ВКЛАДЕНИМИ РОУТАМИ */}
      <Route
        path="/admin"
        element={
          <Guard>
            <AdminLayout />
          </Guard>
        }
      >
        {/* Дашборд */}
        <Route index element={<Dashboard />} />

        {/* Коди */}
        <Route
          path="codes"
          element={
            <Guard roles={['admin', 'manager']}>
              <CodesPage />
            </Guard>
          }
        />

        {/* Сесії */}
        <Route
          path="sessions"
          element={
            <Guard roles={['admin', 'support']}>
              <Sessions />
            </Guard>
          }
        />

        {/* Аналітика */}
        <Route
          path="analytics"
          element={
            <Guard roles={['admin', 'analyst']}>
              <Analytics />
            </Guard>
          }
        />

        {/* Адмін-користувачі */}
        <Route
          path="admins"
          element={
            <Guard roles={['admin']}>
              <Admins />
            </Guard>
          }
        />

        {/* Події: список/редагування метаданих */}
        <Route
          path="events"
          element={
            <Guard roles={['admin']}>
              <EventsList />
            </Guard>
          }
        />
        <Route
          path="events/new"
          element={
            <Guard roles={['admin']}>
              <EventEdit />
            </Guard>
          }
        />
        <Route
          path="events/:id"
          element={
            <Guard roles={['admin']}>
              <EventEdit />
            </Guard>
          }
        />

        {/* Редактор сторінки (HTML/CSS/JS) */}
        <Route
          path="events/:id/page"
          element={
            <Guard roles={['admin']}>
              <PageEditor />
            </Guard>
          }
        />
      </Route>

      {/* Fallback: краще на головну, щоб випадково не перехопити /p/:slug */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
