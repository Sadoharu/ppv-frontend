// src/pages/admin/PageEditor.tsx
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  getEventPage,
  putEventPage,
  publishEvent,
  unpublishEvent,
  issuePreviewToken,
  buildPreviewUrl,
  type EventPage,
} from '@/api/adminEventPage'

export default function PageEditor() {
  const { id } = useParams()
  const eventId = Number(id)

  const [page, setPage] = useState<EventPage>({
    page_html: '',
    page_css: '',
    page_js: '',
    runtime_js_version: 'latest',
    assets_base_url: '',
  })
  const [etag, setEtag] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setDirty] = useState(false)

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // warn on unload if unsaved
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  // initial load
  useEffect(() => {
  let dead = false
  setLoading(true)
  setError(null)

  ;(async () => {
    try {
      const { data, etag: e } = await getEventPage(eventId) // без etag → no-cache
      if (dead || !mounted.current) return
      if (data) setPage(prev => ({ ...prev, ...data })) // важливо: тільки якщо є тіло
      setEtag(e)
    } catch (err: any) {
      if (!dead) setError(err?.message || 'Помилка завантаження сторінки')
    } finally {
      if (!dead) setLoading(false)
    }
  })()

  return () => { dead = true }
}, [eventId])

async function saveDraft(showToast = true) {
  setSaving(true)
  setError(null)
  try {
    const { etag: newEtag } = await putEventPage(eventId, page, etag)

    // одразу перезчитуємо свіжий стан (без If-None-Match, щоб точно отримати тіло)
    const fresh = await getEventPage(eventId)
    if (mounted.current) {
      if (fresh.data) setPage(prev => ({ ...prev, ...fresh.data }))
      setEtag(fresh.etag || newEtag || null)
      setDirty(false)
      if (showToast) alert('Збережено (draft)')
    }
  } catch (err: any) {
    if (err?.name === 'PreconditionFailed' || err?.response?.status === 412) {
      const confirmReload = confirm('Сторінка змінена іншою сесією. Завантажити актуальну версію з сервера? Ваші незбережені зміни буде перезаписано.')
      if (confirmReload) {
        const latest = await getEventPage(eventId)
        if (latest.data) setPage(prev => ({ ...prev, ...latest.data }))
        setEtag(latest.etag || null)
        setDirty(false)
      }
    } else {
      setError(err?.message || 'Помилка збереження')
    }
  } finally {
    if (mounted.current) setSaving(false)
  }
}


  async function onPublish() {
    await saveDraft(false)
    await publishEvent(eventId)
    alert('Опубліковано')
  }

  async function onUnpublish() {
    await unpublishEvent(eventId)
    alert('Знято з публікації')
  }

  async function onPreview() {
    await saveDraft(false)
    const token = await issuePreviewToken(eventId)
    const url = buildPreviewUrl(eventId, token)
    window.open(url, '_blank', 'noopener')
  }

  const onField =
    <K extends keyof EventPage>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const v = e.target.value
      setPage(p => ({ ...p, [key]: v }))
      setDirty(true)
    }

  if (loading) return <div className="p-6">Завантаження…</div>

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Редактор сторінки події #{eventId}</h1>

      {error && <div className="p-3 rounded bg-red-50 text-red-700 border border-red-200">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <div className="text-sm font-medium mb-1">HTML</div>
          <textarea
            className="border rounded w-full min-h-[260px] p-2 font-mono"
            value={page.page_html}
            onChange={onField('page_html')}
            placeholder="<div id=&quot;player&quot;></div>"
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium mb-1">CSS</div>
          <textarea
            className="border rounded w-full min-h-[260px] p-2 font-mono"
            value={page.page_css || ''}
            onChange={onField('page_css')}
            placeholder="#player{height:360px}"
          />
        </label>

        <label className="block md:col-span-2">
          <div className="text-sm font-medium mb-1">JS (виконається ПІСЛЯ PPV runtime)</div>
          <textarea
            className="border rounded w-full min-h-[220px] p-2 font-mono"
            value={page.page_js || ''}
            onChange={onField('page_js')}
            placeholder={`(async()=>{ const {ok}=await PPV.session.ensureAccess(); if(!ok)return; PPV.player.mount('#player',{src:PPV.env?.hls}); PPV.analytics.track('page_ready') })();`}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="block">
          <div className="text-sm font-medium mb-1">Runtime JS version</div>
          <input
            className="border rounded w-full p-2"
            value={page.runtime_js_version || 'latest'}
            onChange={onField('runtime_js_version')}
            placeholder="latest"
          />
        </label>

        <label className="block md:col-span-2">
          <div className="text-sm font-medium mb-1">Assets base URL (CDN)</div>
          <input
            className="border rounded w-full p-2"
            value={page.assets_base_url || ''}
            onChange={onField('assets_base_url')}
            placeholder="https://cdn.example.com/ppv/assets/event-123/"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => saveDraft(true)} className="px-4 py-2 rounded border" disabled={saving}>
          Save draft
        </button>
        <button onClick={onPublish} className="px-4 py-2 rounded bg-emerald-600 text-white" disabled={saving}>
          Publish
        </button>
        <button onClick={onUnpublish} className="px-4 py-2 rounded border" disabled={saving}>
          Unpublish
        </button>
        <button onClick={onPreview} className="px-4 py-2 rounded border" disabled={saving}>
          Preview
        </button>

        <span className="text-xs text-slate-500">ETag: {etag || '—'}</span>
        {isDirty && <span className="text-xs text-amber-600">• Є незбережені зміни</span>}
      </div>
    </div>
  )
}
