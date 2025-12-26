// src/components/events/EventForm.tsx
import { useEffect, useMemo, useState } from 'react'
import type { AdminEvent } from '@/api/adminEvents'
import { isoToLocalInput, localInputToIso } from '@/utils/datetime'
import { slugify } from '@/utils/slugify'

type Props = {
  initial?: Partial<AdminEvent>
  saving?: boolean
  onSubmit: (data: Partial<AdminEvent>) => void | Promise<void>
  onCancel?: () => void
  submitLabel?: string
}

const EMPTY: Partial<AdminEvent> = {
  title: '',
  slug: '',
  status: 'draft',
  starts_at: '',
  ends_at: '',
  thumbnail_url: '',
  short_description: '',
  player_manifest_url: '',
}

export default function EventForm({
  initial, saving, onSubmit, onCancel, submitLabel = 'Зберегти',
}: Props) {
  const [data, setData] = useState<Partial<AdminEvent>>({ ...EMPTY, ...initial })

  const [startsLocal, setStartsLocal] = useState('')
  const [endsLocal, setEndsLocal] = useState('')

  useEffect(() => {
    const base = { ...EMPTY, ...initial }
    setData(base)
    setStartsLocal(isoToLocalInput(base.starts_at as any))
    setEndsLocal(isoToLocalInput(base.ends_at as any))
  }, [initial])

  const canSubmit = useMemo(() => Boolean(data.title?.trim()) && !saving, [data.title, saving])

  return (
    <form
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!canSubmit) return
        const payload: Partial<AdminEvent> = {
          ...data,
          title: data.title?.trim() || '',
          slug: (data.slug && data.slug.trim()) || undefined,
          starts_at: localInputToIso(startsLocal),
          ends_at: localInputToIso(endsLocal),
        }
        await onSubmit(payload)
      }}
    >
      <label className="block">
        <div className="text-sm font-medium">Назва *</div>
        <input
          className="border rounded px-3 py-2 w-full"
          value={data.title || ''}
          onChange={e => setData({ ...data, title: e.target.value })}
          onBlur={() => {
            if (!(data.slug || '').trim() && (data.title || '').trim()) {
              setData(d => ({ ...d, slug: slugify(d.title || '') }))
            }
          }}
          placeholder="Kyiv Media Fest 2025"
          autoFocus
        />
      </label>

      <label className="block">
        <div className="text-sm font-medium">Slug</div>
        <div className="flex gap-2">
          <input
            className="border rounded px-3 py-2 w-full"
            value={data.slug || ''}
            onChange={e => setData({ ...data, slug: e.target.value })}
            placeholder="kyiv-media-fest-2025"
          />
          <button
            type="button"
            className="border rounded px-3"
            onClick={() => setData(d => ({ ...d, slug: slugify(d.title || d.slug || '') }))}
          >
            Згенерувати
          </button>
        </div>
      </label>

      <label className="block">
        <div className="text-sm font-medium">Статус</div>
        <select
          className="border rounded px-3 py-2 w-full"
          value={data.status || 'draft'}
          onChange={e => setData({ ...data, status: e.target.value as any })}
        >
          <option value="draft">draft</option>
          <option value="scheduled">scheduled</option>
          <option value="published">published</option>
          <option value="live">live</option>
          <option value="ended">ended</option>
          <option value="archived">archived</option>
        </select>
      </label>

      <label className="block">
        <div className="text-sm font-medium">Початок</div>
        <input
          type="datetime-local"
          className="border rounded px-3 py-2 w-full"
          value={startsLocal}
          onChange={e => setStartsLocal(e.target.value)}
        />
      </label>

      <label className="block">
        <div className="text-sm font-medium">Кінець</div>
        <input
          type="datetime-local"
          className="border rounded px-3 py-2 w-full"
          value={endsLocal}
          onChange={e => setEndsLocal(e.target.value)}
        />
      </label>

      <label className="block md:col-span-2">
        <div className="text-sm font-medium">HLS manifest URL</div>
        <input
          className="border rounded px-3 py-2 w-full"
          value={data.player_manifest_url || ''}
          onChange={e => setData({ ...data, player_manifest_url: e.target.value })}
          placeholder="https://cdn/.../live.m3u8"
        />
      </label>

      <label className="block">
        <div className="text-sm font-medium">Thumbnail URL</div>
        <input
          className="border rounded px-3 py-2 w-full"
          value={data.thumbnail_url || ''}
          onChange={e => setData({ ...data, thumbnail_url: e.target.value })}
        />
      </label>

      <label className="block md:col-span-2">
        <div className="text-sm font-medium">Опис</div>
        <textarea
          className="border rounded px-3 py-2 w-full min-h-[100px]"
          value={data.short_description || ''}
          onChange={e => setData({ ...data, short_description: e.target.value })}
        />
      </label>

      <div className="md:col-span-2 flex gap-2 pt-2">
        {onCancel && (
          <button type="button" className="px-4 py-2 rounded border" onClick={onCancel}>
            Скасувати
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 rounded bg-slate-900 text-white disabled:opacity-60"
          disabled={!canSubmit}
        >
          {saving ? 'Збереження…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
