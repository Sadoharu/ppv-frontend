// src/types/codes.ts
//done
export type CodeRow = {
  id: number
  code?: string
  active: boolean
  max_concurrent_sessions: number
  cooldown_seconds: number
  event?: string | null
  created_at?: string
  expires_at?: string | null
  batch_label?: string | null
  allow_all_events?: boolean
  allowed_event_ids?: number[]
}

export type EventItem = { id: number; title: string; slug: string }