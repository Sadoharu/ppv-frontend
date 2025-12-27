// src/types/sessions.ts
//done
export type SessionRow = {
  id: string
  code_id: number
  code?: string
  event?: string | null

  active: boolean
  connected: boolean
  online?: boolean
  ip?: string | null
  ua?: string
  user_agent?: string | null

  created_at?: string | null
  last_seen?: string | null
  expires_at?: string | null

  watch_seconds?: number
  bytes_out?: number
}

export type ListResponse = { total: number; items: SessionRow[] } | SessionRow[]
