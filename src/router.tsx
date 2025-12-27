import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import LoginPage from './pages/LoginPage'
import UserLogin from './pages/UserLogin'
import Dashboard from './pages/Dashboard'
import EventsGrid from './pages/EventsGrid'
import EventWatch from './pages/EventWatch'
import Admins from './pages/Admins'
import Analytics from './pages/Analytics'
import Codes from './pages/Codes'

import AdminLayout from './layouts/AdminLayout'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import EventsList from './pages/admin/EventsList'
import EventCreate from './pages/admin/EventCreate'
import EventEdit from './pages/admin/EventEdit'
import SessionsPage from './pages/admin/SessionsPage'
import CodesPage from './pages/admin/CodesPage'
import PageEditor from './pages/admin/PageEditor'

import RequireAdmin from './components/RequireAdmin'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '',
        element: <EventsGrid />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'u/login',
        element: <UserLogin />,
      },
      // Маршрути плеєра
      {
        path: 'events/:slug', 
        element: <EventWatch />,
      },
      {
        path: 'p/:slug', // Емуляція продакшн шляху
        element: <EventWatch />,
      },
      
      // Адмінка
      {
        path: 'admin/login',
        element: <AdminLoginPage />,
      },
      {
        path: 'admin',
        element: <RequireAdmin><AdminLayout /></RequireAdmin>,
        children: [
          { path: '', element: <Dashboard /> },
          { path: 'events', element: <EventsList /> },
          { path: 'events/new', element: <EventCreate /> },
          { path: 'events/:id', element: <EventEdit /> },
          { path: 'events/:id/page', element: <PageEditor /> },
          { path: 'sessions', element: <SessionsPage /> },
          { path: 'codes', element: <CodesPage /> },
          { path: 'admins', element: <Admins /> },
          { path: 'analytics', element: <Analytics /> },
        ]
      }
    ]
  }
])