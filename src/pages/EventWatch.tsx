// src/pages/EventWatch.tsx
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'

/**
 * Тимчасовий місток для збереження зворотної сумісності:
 * /events/:slug -> /p/:slug (HTML, який збирає бекенд з PPV runtime)
 */
export default function EventWatch() {
  const { slug } = useParams()

  useEffect(() => {
    if (slug) {
      // Використовуємо replace, щоб не залишати "мертву" SPA-сторінку в історії
      window.location.replace(`/p/${encodeURIComponent(slug)}`)
    }
  }, [slug])

  return (
    <div className="min-h-screen grid place-items-center text-sm text-slate-500">
      Переадресація на сторінку події…
    </div>
  )
}
