// src/api/codes.ts
import adminApi from '@/api/adminClient'

export type AccessCode = {
  id: number
  code_hash: string
  active: boolean
  max_concurrent_sessions: number
  cooldown_seconds: number
  created_at?: string
}

export async function createCodesJSON(items: Array<{
  code: string
  active?: boolean
  max_concurrent_sessions?: number
  cooldown_seconds?: number
}>) {
  // POST /admin/codes/bulk
  const { data } = await adminApi.post('/api/admin/codes/bulk', { items })
  return data // сервер повертає набір згенерованих кодів або мапу
}

export async function patchCode(codeId: number, patch: Partial<{
  active: boolean
  max_concurrent_sessions: number
  cooldown_seconds: number
}>) {
  // PATCH /admin/codes/{code_id}
  const { data } = await adminApi.patch(`/api/admin/codes/${codeId}`, patch)
  return data
}

export async function reissueCode(codeId: number) {
  // POST /admin/codes/{code_id}/reissue
  const { data } = await adminApi.post(`/api/admin/codes/${codeId}/reissue`)
  return data // нове значення коду (plaintext), якщо бек це повертає
}

export async function forceLogoutCode(codeId: number) {
  // POST /admin/codes/{code_id}/force-logout
  const { data } = await adminApi.post(`/api/admin/codes/${codeId}/force-logout`)
  return data
}
