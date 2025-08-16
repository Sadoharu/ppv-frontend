import api from './adminClient'

export async function listSessions(params?: { status?: string; code_id?: number; limit?: number; offset?: number }) {
  const { data } = await api.get('/api/admin/sessions', { params })
  return data as { total: number; items: any[] }
}

export async function revokeSession(id: string) {
  return api.post(`/api/admin/sessions/${id}/revoke`)
}

export async function deleteSession(id: string) {
  return api.delete(`/api/admin/sessions/${id}`)
}
