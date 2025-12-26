// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

function stripSlash(u: string) { return u.replace(/\/+$/, '') }
function httpToWs(u: string) {
  if (/^wss?:/i.test(u)) return u // вже ws/wss
  return u.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:')
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = stripSlash(env.VITE_API_BASE || 'http://localhost:8000')
  const wsTarget = stripSlash(env.VITE_WS_BASE || httpToWs(target))

  // зручний логер помилок проксі
  const withDebug = (p: any) => ({
    changeOrigin: true,
    secure: false,
    ...p,
    configure(proxy: any) {
      proxy.on('error', (err: any, _req: any, _res: any) => {
        console.error('[vite-proxy]', err?.message || err)
      })
      p?.configure?.(proxy)
    },
  })

  return {
    plugins: [react()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      host: true,
      port: 5173,
      proxy: {
        // ───── API (HTTP) ─────
        '/api': withDebug({ target }),

        // ───── Admin WS (вебсокети) ─────
        '/api/ws': withDebug({ target: wsTarget, ws: true }),

        // ───── Server-rendered HTML (must bypass SPA) ─────
        // Публічна кастомна сторінка /p/:slug
        '^/p/.*': withDebug({ target }),
        // Превʼю та сторінка за id (HTML)
        '^/events/\\d+/preview.*': withDebug({ target }),
        '^/events/\\d+/page.*': withDebug({ target }),

        // ───── Runtime & user assets (щоб брати з бекенду/CDN) ─────
        '^/runtime/.*': withDebug({ target }),
        '^/event-assets/.*': withDebug({ target }),
      },
    },
  }
})
