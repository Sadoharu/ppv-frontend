// src/api/analytics.ts
import adminApi from '@/api/adminClient'

export type CodeStats = {
  code_id: number
  sessions: number
  watch_seconds: number
  bytes_out: number
}

export async function getCodeStats(codeId: number) {
  // GET /api/admin/analytics/codes/{code_id}
  const { data } = await adminApi.get(`/api/admin/analytics/codes/${codeId}`)
  return data as CodeStats
}
