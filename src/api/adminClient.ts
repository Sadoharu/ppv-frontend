// src/api/adminClient.ts
import axios, { AxiosError } from 'axios'

const BASE = (import.meta.env.VITE_API_BASE?.trim() || 'http://localhost:8000').replace(/\/+$/, '')
const adminApi = axios.create({ baseURL: BASE, withCredentials: false })

let adminAccess: string | null = null
let autoLogoutTimer: number | null = null
let refreshing = false
let waiters: Array<(t: string | null) => void> = []
let bootstrapping = false
let bootResolvers: Array<(ok: boolean) => void> = []

function getExpMs(jwt: string): number | null {
  try {
    const b64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = JSON.parse(atob(b64))
    return typeof json.exp === 'number' ? json.exp * 1000 : null
  } catch { return null }
}

function scheduleAutoLogout(token: string) {
  if (autoLogoutTimer) window.clearTimeout(autoLogoutTimer)
  const expMs = getExpMs(token); if (!expMs) return
  const inMs = Math.max(500, expMs - Date.now() - 3000)
  autoLogoutTimer = window.setTimeout(() => {
    clearAdminAccess()
    window.location.href = '/admin/login'
  }, inMs)
}

export function setAdminAccess(token: string | null) {
  adminAccess = token
  if (token) {
    try { localStorage.setItem('admin_access', token) } catch {}
    scheduleAutoLogout(token)
  } else {
    try { localStorage.removeItem('admin_access') } catch {}
    if (autoLogoutTimer) window.clearTimeout(autoLogoutTimer)
  }
}

export function clearAdminAccess() { setAdminAccess(null) }

export function initAdminAuthFromStorage() {
  try {
    const t = localStorage.getItem('admin_access')
    if (t) setAdminAccess(t)
  } catch {}
}

adminApi.interceptors.request.use((config) => {
  if (adminAccess) {
    if (config.headers && typeof (config.headers as any).set === 'function') {
      ;(config.headers as any).set('Authorization', `Bearer ${adminAccess}`)
    } else {
      config.headers = { ...(config.headers || {}), Authorization: `Bearer ${adminAccess}` } as any
    }
  }
  return config
})

function onRefreshed(t: string | null) { waiters.forEach(fn => fn(t)); waiters = [] }

async function doRefresh(): Promise<string | null> {
  try {
    const r = await axios.post(`${BASE}/api/admin/refresh`, {}, { withCredentials: true })
    const t = r.data?.access_token ?? null
    if (t) setAdminAccess(t)
    return t
  } catch {
    clearAdminAccess()
    return null
  }
}

adminApi.interceptors.response.use(
  r => r,
  async (error: AxiosError<any>) => {
    const status = error.response?.status
    const detail = (error.response?.data as any)?.detail

    if (status === 401 && detail === 'token_expired') {
      if (!refreshing) {
        refreshing = true
        const t = await doRefresh()
        refreshing = false
        onRefreshed(t)
      }
      return new Promise((resolve, reject) => {
        waiters.push(async (t) => {
          if (!t) { window.location.href = '/admin/login'; reject(error); return }
          try {
            const cfg = error.config!
            cfg.headers = cfg.headers || {}
            ;(cfg.headers as any).Authorization = `Bearer ${t}`
            resolve(await axios.request(cfg))
          } catch (e) { reject(e) }
        })
      })
    }

    if (status === 401 && (detail === 'missing_token' || detail === 'token_invalid')) {
      // якщо ще йде boot — дочекайся
      if (bootstrapping) {
        const ok = await bootstrapAdminAuth()
        if (ok && adminAccess) {
          const cfg = error.config!
          cfg.headers = cfg.headers || {}
          ;(cfg.headers as any).Authorization = `Bearer ${adminAccess}`
          return axios.request(cfg)
        }
      }
      // не вийшло — редірект
      clearAdminAccess()
      window.location.href = '/admin/login?reason=missing_token'
      return Promise.reject(error)
    }

    if (status === 401) {
      clearAdminAccess()
      window.location.href = '/admin/login'
    }
    return Promise.reject(error)
  }
)

export default adminApi

export async function bootstrapAdminAuth(): Promise<boolean> {
  if (bootstrapping) {
    // вже йде — чекаємо завершення
    return new Promise(resolve => bootResolvers.push(resolve))
  }
  bootstrapping = true

  // 1) підхопити токен із localStorage
  let t: string | null = null
  try { t = localStorage.getItem('admin_access') } catch {}
  if (t) {
    setAdminAccess(t)
    const expMs = getExpMs(t)
    // якщо до exp < 10с — одразу тихий refresh, інакше стартуємо з цим токеном
    if (!expMs || expMs - Date.now() < 10_000) {
      const rt = await doRefresh()
      const ok = !!rt
      bootstrapping = false
      bootResolvers.forEach(r => r(ok)); bootResolvers = []
      return ok
    } else {
      bootstrapping = false
      bootResolvers.forEach(r => r(true)); bootResolvers = []
      return true
    }
  }

  // 2) токена немає — спробувати refresh із HttpOnly cookie
  const rt = await doRefresh()
  const ok = !!rt
  bootstrapping = false
  bootResolvers.forEach(r => r(ok)); bootResolvers = []
  return ok
}

// Корисно, якщо хочеш десь просто "дочекатися готовності"
export const authReadyPromise = () => bootstrapAdminAuth()
