import adminApi from './adminClient'

export interface AdminUser {
  id: number
  email: string
  role: 'super' | 'admin' | 'manager' | 'support' | 'analyst'
  name?: string | null
}

// === CURRENT ADMIN PROFILE ===

export async function fetchMe() {
  // Спробуємо v1. Якщо впаде 404 - це очікувано, якщо бекенд ще не готовий.
  // Але фронт готовий до цього.
  const { data } = await adminApi.get('/api/admin/me')
  return data as AdminUser
}

// === ADMINS MANAGEMENT (RBAC) ===

export async function fetchAdmins() {
  const { data } = await adminApi.get('/api/v1/admin/admins')
  return data as AdminUser[]
}

export async function createAdmin(body: { email: string; password?: string; role: string }) {
  return adminApi.post('/api/v1/admin/admins', body)
}

export async function updateAdmin(id: number, body: Partial<{ email: string; password?: string; role: string }>) {
  return adminApi.patch(`/api/v1/admin/admins/${id}`, body)
}

export async function deleteAdmin(id: number) {
  return adminApi.delete(`/api/v1/admin/admins/${id}`)
}

// === ACCESS CODES ===
// ! ВАЖЛИВО: Повертаємо старий префікс /api/admin/codes, бо /api/v1/admin/codes повертає 404.
// Коли бекенд оновить роутинг, можна буде змінити на /api/v1.

// список кодів
export async function fetchCodes(params: { limit?: number; offset?: number; q?: string; active?: boolean }) {
  const { data } = await adminApi.get('/api/admin/codes', { params })
  return data as { total: number; items: any[] }
}

// оновлення коду
export async function patchCode(
  id: number,
  body: Partial<{
    allowed_sessions: number
    max_concurrent_sessions: number
    revoked: boolean
    expires_at: string | null
  }>
) {
  return adminApi.patch(`/api/admin/codes/${id}`, body)
}

// видалення коду
export async function deleteCode(id: number) {
  return adminApi.delete(`/api/admin/codes/${id}`)
}

// перевипустити plaintext
export async function reissueCode(id: number) {
  const { data } = await adminApi.post(`/api/admin/codes/${id}/reissue`)
  return data as { code: string }
}

// примусовий вихід з усіх сесій
export async function forceLogoutCode(id: number) {
  const { data } = await adminApi.post(`/api/admin/codes/${id}/force-logout`)
  return data as { ok: boolean; detail?: string }
}

// експорт CSV
export async function exportCodes(params: { q?: string; active?: boolean }) {
  const search = new URLSearchParams()
  if (params.q && params.q.trim()) search.set('q', params.q.trim())
  if (typeof params.active === 'boolean') search.set('active', params.active ? '1' : '0')
  return adminApi.get(`/api/admin/codes/export?${search.toString()}`, { responseType: 'blob' })
}

// імпорт CSV
export async function importCodesCSV(
  file: File,
  opts: {
    code_column?: string
    sessions_column?: string
    active_column?: string
    expires_column?: string
    event_column?: string
    default_sessions?: number
    default_active?: boolean
    default_expires_at?: string
    event?: string
    has_header?: boolean
    force_sessions?: boolean
    force_active?: boolean
    force_expires?: boolean
    force_event?: boolean
  } = {}
) {
  const fd = new FormData()
  fd.append('file', file)

  if (opts.code_column)     fd.append('code_column', opts.code_column)
  if (opts.sessions_column) fd.append('sessions_column', opts.sessions_column)
  if (opts.active_column)   fd.append('active_column', opts.active_column)
  if (opts.expires_column)  fd.append('expires_column', opts.expires_column)
  if (opts.event_column)    fd.append('event_column', opts.event_column)

  if (opts.default_sessions != null) fd.append('default_sessions', String(opts.default_sessions))
  if (opts.default_active != null)   fd.append('default_active', opts.default_active ? '1' : '0')
  if (opts.default_expires_at)       fd.append('default_expires_at', opts.default_expires_at)
  if (opts.event)                    fd.append('event', opts.event)

  if (opts.has_header != null) fd.append('has_header', opts.has_header ? '1' : '0')

  if (opts.force_sessions != null) fd.append('force_sessions', opts.force_sessions ? '1' : '0')
  if (opts.force_active != null)   fd.append('force_active', opts.force_active ? '1' : '0')
  if (opts.force_expires != null)  fd.append('force_expires', opts.force_expires ? '1' : '0')
  if (opts.force_event != null)    fd.append('force_event', opts.force_event ? '1' : '0')

  return adminApi.post('/api/admin/codes/import', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}