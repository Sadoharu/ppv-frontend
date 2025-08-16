// src/pages/Watch.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import userApi from '@/api/userClient'

export default function Watch() {
  const [ok, setOk] = useState<boolean | null>(null)
  const navigate = useNavigate()

  // 1) верифікація куки
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // обов'язково з withCredentials, щоб кук полетів
        const r = await userApi.get('/api/auth/verify_user', {
          withCredentials: true,
          validateStatus: () => true,
        })
        if (cancelled) return
        if (r.status >= 200 && r.status < 300) {
          setOk(true)
        } else {
          setOk(false)
        }
      } catch {
        if (!cancelled) setOk(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // 2) редірект, якщо неавторизований
  useEffect(() => {
    if (ok === false) navigate('/', { replace: true })
  }, [ok, navigate])

  // 3) ініціалізація плеєра + live WS/heartbeat тільки коли ок
useEffect(() => {
  if (ok !== true) return

  let player: any
  let ws: WebSocket | null = null
  let pingTimer: any = null
  let hbTimer: any = null

  const apiBase = (import.meta.env.VITE_API_BASE?.trim() || 'http://localhost:8000')
  const wsBase  = apiBase.replace(/^http/i, location.protocol === 'https:' ? 'wss' : 'ws')

  const init = async () => {
    // 1) дістаємо session_id з бекенду (fallback — кука sid)
    let sid: string | undefined
    try {
      const who = await userApi.get('/api/auth/verify_user', { withCredentials: true })
      sid = who.data?.session_id
    } catch {
      // ignore
    }
    if (!sid) {
      sid = (document.cookie.match(/(?:^|;\s*)sid=([^;]+)/) || [])[1]
    }

    // 2) будуємо WS URL так, як очікує сервер
    const wsUrl = sid
      ? `${wsBase}/api/ws/client?session_id=${encodeURIComponent(sid)}`
      : `${wsBase}/api/ws/client`

    // 3) довантажуємо скрипти плеєра
    await import('https://vjs.zencdn.net/8.3.0/video.min.js')
    await import('https://unpkg.com/@silvermine/videojs-quality-selector/dist/js/silvermine-videojs-quality-selector.min.js')

    // @ts-ignore
    const vjs = (window as any).videojs
    player = vjs('videoPlayer', {
      liveui: true,
      html5: { vhs: { limitRenditionByPlayerDimensions: false } },
      controlBar: { pictureInPictureToggle: false },
    })

    player.ready(() => {
      try { player.controlBar.addChild('QualitySelector') } catch {}
    })

    const seekToLive = () => {
      if (player?.liveTracker?.isLive()) player.liveTracker.seekToLiveEdge()
    }

    let seekEnabled = false
    let seekUpdates = 0

    player.on('loadedmetadata', () => {
      seekToLive()
      seekEnabled = true
      seekUpdates = 3
    })

    const checkAndSeek = () => {
      if (!seekEnabled || seekUpdates <= 0) return
      seekUpdates--
      if (player?.liveTracker?.isLive()) {
        const liveEdge = player.liveTracker.liveCurrentTime()
        const cur = player.currentTime()
        if (Math.abs(liveEdge - cur) > 10) player.currentTime(liveEdge)
      }
      if (seekUpdates <= 0) seekEnabled = false
    }
    player.on('timeupdate', checkAndSeek)

    player.on('resolutionchange', () => {
      const wasLive = player?.liveTracker?.isLive()
      const cur = player.currentTime()
      player.one('loadedmetadata', () => {
        if (wasLive) seekToLive()
        else player.currentTime(cur)
      })
    })

    // ───────── WebSocket клієнта
    try {
      ws = new WebSocket(wsUrl)

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg?.type === 'terminate') {
            try { player?.dispose?.() } catch {}
            document.cookie = 'access_token=; Max-Age=0; path=/'
            document.cookie = 'sid=; Max-Age=0; path=/'
            window.location.href = '/'
          }
        } catch {
          /* non-JSON — ігноруємо */
        }
      }

      // keepalive для WS
      pingTimer = setInterval(() => {
        if (ws?.readyState === 1) ws.send('ping')
      }, 20000)
    } catch {}

    // ───────── Heartbeat (HTTP, з куками)
    const sendHB = async () => {
      try {
        await userApi.post('/api/heartbeat', null, { withCredentials: true })
      } catch {}
    }
    sendHB()
    hbTimer = setInterval(sendHB, 30000)

    // необов’язково: при поверненні у вкладку — ще один heartbeat
    const onVis = () => { if (document.visibilityState === 'visible') sendHB() }
    document.addEventListener('visibilitychange', onVis)

    const onUnload = () => { try { ws?.close() } catch {} }
    window.addEventListener('beforeunload', onUnload)

    // повертаємо “частковий” cleanup для внутрішніх слухачів
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('beforeunload', onUnload)
    }
  }

  // запустити async ініціалізацію
  init()

  // загальний cleanup ефекту
  return () => {
    try { if (pingTimer) clearInterval(pingTimer) } catch {}
    try { if (hbTimer) clearInterval(hbTimer) } catch {}
    try { ws?.close() } catch {}
    try { player?.dispose?.() } catch {}
  }
}, [ok])




  if (ok === null) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-600">
        Перевірка доступу…
      </div>
    )
  }

  if (ok === false) {
    // короткий блимаючий екран; редірект робить useEffect вище
    return null
  }

  // ok === true
  return (
    <div className="min-h-screen grid place-items-center p-4">
      <link
        href="https://vjs.zencdn.net/8.3.0/video-js.min.css"
        rel="stylesheet"
      />
      <link
        href="https://unpkg.com/@silvermine/videojs-quality-selector/dist/css/quality-selector.css"
        rel="stylesheet"
      />

      <div className="w-full max-w-5xl">
        <video
          id="videoPlayer"
          className="video-js vjs-default-skin"
          controls
          preload="auto"
          width="960"
          height="540"
        >
          <source src="https://cdn1-zak.b-cdn.net/master.m3u8" type="application/x-mpegURL" label="auto" />
          <source src="https://cdn1-zak.b-cdn.net/hls1080/live/index.m3u8" type="application/x-mpegURL" label="1080p" res="1080" />
          <source src="https://cdn1-zak.b-cdn.net/hls720/live/index.m3u8" type="application/x-mpegURL" label="720p" res="720" />
          <source src="https://cdn1-zak.b-cdn.net/hls480/live/index.m3u8" type="application/x-mpegURL" label="480p" res="480" />
          <source src="https://cdn1-zak.b-cdn.net/hls360/live/index.m3u8" type="application/x-mpegURL" label="360p" res="360" />
        </video>

        <div className="mt-3 flex justify-end">
          <button
            className="brutalist-btn border px-3 py-2 rounded"
            onClick={async () => {
              try {
                // Логаут юзерської сесії
                // Якщо ти зберігаєш session_id у куці (sid), витягни та передай у body
                const sid = (document.cookie.match(/sid=([^;]+)/) || [])[1]
                await userApi.post('/api/auth/logout', { session_id: sid })
              } catch {}
              // Прибити куки локально
              document.cookie = 'access_token=; Max-Age=0; path=/'
              document.cookie = 'sid=; Max-Age=0; path=/'
              // На головну
              window.location.href = '/'
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
