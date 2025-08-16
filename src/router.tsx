// src/router.tsx
import { createBrowserRouter } from 'react-router-dom'
import EventsGrid from '@/pages/EventsGrid'
import EventWatch from '@/pages/EventWatch'

export const router = createBrowserRouter([
  { path: '/', element: <EventsGrid /> },
  { path: '/events', element: <EventsGrid /> },
  { path: '/events/:slug', element: <EventWatch /> },
])
