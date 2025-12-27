// src/pages/EventWatch.tsx
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { VideoPlayer } from '../components/player/VideoPlayer'

export default function EventWatch() {
  const { slug } = useParams()
  const [bootData, setBootData] = useState<Window['__PPV_BOOT__'] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 1. Спроба зчитати дані, які бекенд поклав у <head>
    const data = window.__PPV_BOOT__

    if (data && data.env) {
      // Якщо дані є - зберігаємо їх у стейт
      setBootData(data)
    } else {
      // Якщо даних немає, це може означати:
      // а) Ми прийшли через SPA-навігацію (клік по лінку), і сторінка не перезавантажувалась.
      // б) Бекенд не віддав дані.
      // в) Це локальна розробка.
      
      console.warn('PPV Boot data missing. SSR injection not found.')
      
      // Логіка для обробки відсутності даних.
      // Оскільки це "захищений" перегляд, найкращий варіант - запропонувати оновити сторінку,
      // щоб бекенд заново згенерував токени та інжегував їх.
      setError('Дані трансляції не знайдено. Будь ласка, оновіть сторінку.')
    }
  }, [slug])

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center bg-zinc-950 text-white p-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold mb-2 text-red-500">Помилка доступу</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm font-medium transition-colors"
          >
            Оновити сторінку
          </button>
        </div>
      </div>
    )
  }

  // Стан завантаження (поки читаємо window)
  if (!bootData) {
    return (
      <div className="min-h-screen grid place-items-center bg-zinc-950 text-gray-500">
        Завантаження плеєра...
      </div>
    )
  }

  const { env } = bootData

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Простий хедер */}
      <header className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white/90">
            {env.title}
          </h1>
          {slug && <span className="text-xs text-zinc-500 font-mono">ID: {slug}</span>}
        </div>
        {/* Тут можна додати кнопку виходу або статус юзера */}
      </header>

      {/* Основна область плеєра */}
      <main className="flex-grow flex flex-col items-center p-4 md:p-8">
        <div className="w-full max-w-6xl space-y-6">
          
          {/* Контейнер відео */}
          <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
            {env.hls ? (
              <VideoPlayer 
                hlsUrl={env.hls} 
                muxConfig={env.mux}
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-zinc-500 bg-zinc-900/50">
                <div className="text-center">
                  <p className="text-lg font-medium">Трансляція наразі відсутня</p>
                  <p className="text-sm opacity-60">Зачекайте початку ефіру</p>
                </div>
              </div>
            )}
          </div>

          {/* Опис події */}
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800/50">
            <h2 className="text-xl font-semibold mb-3 text-white/90">Про подію</h2>
            <div className="prose prose-invert prose-sm max-w-none text-zinc-400">
              {env.description ? (
                <p>{env.description}</p>
              ) : (
                <p className="italic opacity-50">Опис відсутній</p>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}