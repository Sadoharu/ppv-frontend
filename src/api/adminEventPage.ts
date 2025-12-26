// src/api/adminEventPage.ts
import adminApi from './adminClient'

export type EventPage = {
  page_html: string
  page_css?: string
  page_js?: string
  runtime_js_version?: string // default: "latest"
  assets_base_url?: string
  etag?: string | null
}

export type GetPageResp = {
  data: EventPage | null
  etag: string | null
  notModified: boolean
}

// ——— helpers ———
function pickEtag(h: any): string | null {
  return h?.etag || h?.ETag || h?.['etag'] || h?.['ETag'] || null
}

// сервер може прислати { html, css, js, runtime_js_version, assets_base_url, ... }
function normalizeIn(raw: any): EventPage {
  if (!raw || typeof raw !== 'object') {
    return { page_html: '', page_css: '', page_js: '', runtime_js_version: 'latest', assets_base_url: '' }
  }
  return {
    page_html: raw.page_html ?? raw.html ?? '',
    page_css: raw.page_css ?? raw.css ?? '',
    page_js: raw.page_js ?? raw.js ?? '',
    runtime_js_version: raw.runtime_js_version ?? raw.runtime ?? 'latest',
    assets_base_url: raw.assets_base_url ?? raw.assets_base ?? '',
    etag: raw.etag ?? null,
  }
}

// на збереження шлемо обидва варіанти ключів (щоб бути сумісними з різними беками)
function buildOut(body: Partial<EventPage>) {
  const out = {
    page_html: body.page_html ?? '',
    page_css: body.page_css ?? '',
    page_js: body.page_js ?? '',
    runtime_js_version: body.runtime_js_version ?? 'latest',
    assets_base_url: body.assets_base_url ?? '',
  }
  return {
    ...out,
    // дублікати — якщо бек очікує короткі ключі
    html: out.page_html,
    css: out.page_css,
    js: out.page_js,
  }
}

/** GET сторінки.
 *  Якщо etag не передано — форсимо no-cache, щоб обовʼязково отримати тіло (200).
 *  Якщо etag передано і прийшов 304 — вертаємо { data:null, notModified:true }.
 */
export async function getEventPage(id: number, etag?: string): Promise<GetPageResp> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (etag) {
    headers['If-None-Match'] = etag
  } else {
    headers['Cache-Control'] = 'no-cache'
    headers['Pragma'] = 'no-cache'
  }

  const resp = await adminApi.get(`/api/admin/events/${id}/page`, {
    headers,
    validateStatus: () => true, // самі обробляємо 304
  })

  const newTag = pickEtag(resp.headers)

  if (resp.status === 304) {
    return { data: null, etag: newTag || etag || null, notModified: true }
  }
  if (resp.status < 200 || resp.status >= 300) {
    throw new Error((resp.data as any)?.detail || 'Не вдалося отримати сторінку')
  }
  return { data: normalizeIn(resp.data), etag: newTag, notModified: false }
}

/** PUT сторінки (If-Match коли є etag). На 412 кидаємо name='PreconditionFailed'. */
export async function putEventPage(
  id: number,
  body: Partial<EventPage>,
  currentEtag?: string | null,
): Promise<{ data: EventPage | null; etag: string | null }> {
  const headers: Record<string, string> = {}
  if (currentEtag) headers['If-Match'] = currentEtag

  const resp = await adminApi.put(`/api/admin/events/${id}/page`, buildOut(body), {
    headers,
    validateStatus: () => true,
  })

  if (resp.status === 412) {
    const err = new Error('Є новіша версія сторінки (ETag змінився).') as any
    err.name = 'PreconditionFailed'
    throw err
  }
  if (resp.status < 200 || resp.status >= 300) {
    throw new Error(resp.data?.detail || 'Помилка збереження сторінки')
  }

  return { data: resp.data ? normalizeIn(resp.data) : null, etag: pickEtag(resp.headers) }
}

export async function publishEvent(id: number) {
  const r = await adminApi.post(`/api/admin/events/${id}/publish`, {}, { validateStatus: s => s >= 200 && s < 300 })
  return r.data
}

export async function unpublishEvent(id: number) {
  const r = await adminApi.post(`/api/admin/events/${id}/unpublish`, {}, { validateStatus: s => s >= 200 && s < 300 })
  return r.data
}

export async function issuePreviewToken(id: number): Promise<string> {
  const { data } = await adminApi.post(`/api/admin/events/${id}/preview-token`, {}, { validateStatus: s => s >= 200 && s < 300 })
  return (data?.token as string) || data?.preview_token || ''
}

export function buildPreviewUrl(id: number, token: string) {
  return `/events/${id}/preview?token=${encodeURIComponent(token)}`
}
