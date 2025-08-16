import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Sessions from './pages/admin/SessionsPage'
import Analytics from './pages/Analytics'
import Admins from './pages/Admins'
import AdminLogin from './pages/admin/AdminLoginPage'
import EventsList from '@/pages/admin/EventsList'
import EventEdit from '@/pages/admin/EventEdit'
import EventsGrid from '@/pages/EventsGrid'
import EventWatch from '@/pages/EventWatch'
import UserLogin from '@/pages/UserLogin'

import CodesPage from '@/pages/admin/CodesPage'
// import CodeDetails from '@/pages/CodeDetails'

import AdminLayout from '@/layouts/AdminLayout'
import userApi from '@/api/userClient'

import { useEffect, useState } from 'react'
import { useAuth } from './state/auth'

function RequireViewer({ children }: { children: JSX.Element }) {
  const [ok, setOk] = useState<boolean | null>(null)
  useEffect(() => {
    userApi.get('/api/auth/verify_user', { validateStatus: () => true })
      .then(r => setOk(r.status >= 200 && r.status < 300))
      .catch(() => setOk(false))
  }, [])
  if (ok === null) return null
  if (!ok) return <Navigate to="/" replace />
  return children
}

function Guard({ children, roles }: { children: JSX.Element; roles?: string[] }) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const norm = (s?: string) => (s ?? '').toLowerCase();
  const userRole = norm(role);
  const required = (roles ?? []).map(norm);

  // super завжди має доступ
  if (userRole === 'super') return children;

  // якщо ролі не задано — пускаємо
  if (required.length === 0) return children;

  // якщо користувач має одну з потрібних ролей — пускаємо
  if (required.includes(userRole)) return children;

  // інакше — редірект на дашборд
  return <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* ПУБЛІЧНА ЧАСТИНА */}
      <Route path="/" element={<EventsGrid />} />
      <Route path="/events" element={<EventsGrid />} />
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
        {/* <Route
          path="codes/:id"
          element={
            <Guard roles={['admin', 'manager']}>
              <CodeDetails />
            </Guard>
          }
        /> */}

        Сесії
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

        {/* ПОДІЇ — ДОДАНО */}
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
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}