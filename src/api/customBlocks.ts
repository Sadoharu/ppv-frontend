// src/api/customBlocks.ts
import { getApiBase } from '@/utils/apiBase'

export type CustomBlocksResp = {
  event_id: number
  mode: 'none' | 'html' | 'sandbox'
  html: string
  css: string
  js: string
  version?: string
  // додаткові поля, якщо бек їх віддає:
  theme?: Record<string, unknown> | null
  status?: string
  starts_at?: string | null
  ends_at?: string | null
  player_manifest_url?: string | null
}

export type FetchCustomBlocksOpts = {
  preview?: boolean
  adminAccessToken?: string   // якщо ?preview=1
  etag?: string | null        // If-None-Match
}

export async function fetchCustomBlocks(
  eventId: number,
  opts: FetchCustomBlocksOpts = {}
): Promise<{ data: CustomBlocksResp | null; etag: string | null; notModified: boolean }> {
  const base = getApiBase()
  const url = new URL(`${base}/api/events/${eventId}/custom/blocks`)
  if (opts.preview) url.searchParams.set('preview', '1')

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (opts.etag) headers['If-None-Match'] = opts.etag
  if (opts.preview && opts.adminAccessToken) headers['Authorization'] = `Bearer ${opts.adminAccessToken}`

  const res = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',   // потрібні viewer cookies
    headers,
  })

  if (res.status === 304) {
    return { data: null, etag: opts.etag ?? null, notModified: true }
  }
  if (!res.ok) {
    throw new Error(`custom/blocks ${res.status}`)
  }

  const etag = res.headers.get('etag')
  const json = (await res.json()) as CustomBlocksResp
  return { data: json, etag, notModified: false }
}
