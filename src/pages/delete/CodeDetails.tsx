//src\pages\CodeDetails.tsx
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getCodeStats, CodeStats } from '@/api/analytics'
import DualList, { DualListItem } from '@/components/DualList'
import adminApi from '@/api/adminClient'

type EventItem = {
  id: number
  title: string
  slug: string
}

type CodeDetailsResp = {
  id: number
  // інші поля...
  allow_all_events?: boolean
  allowed_event_ids?: number[]
}

export default function CodeDetails() {
  const { id } = useParams()
  const codeId = Number(id)

  // статистика
  const [stats, setStats] = useState<CodeStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [errorStats, setErrorStats] = useState<string | null>(null)

  // доступ до подій
  const [events, setEvents] = useState<EventItem[]>([])
  const [allowAll, setAllowAll] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [loadingAccess, setLoadingAccess] = useState(false)
  const [savingAccess, setSavingAccess] = useState(false)
  const [errorAccess, setErrorAccess] = useState<string | null>(null)
  const [savedOk, setSavedOk] = useState(false)

  const leftItems: DualListItem[] = events
  .filter(e => !selectedIds.includes(e.id))
  .map(e => ({ id: e.id, label: `${e.title} (${e.slug})` }))

  const rightItems: DualListItem[] = events
  .filter(e => selectedIds.includes(e.id))
  .map(e => ({ id: e.id, label: `${e.title} (${e.slug})` }))

  // завантаження статистики
  useEffect(() => {
    if (!codeId) return
    setLoadingStats(true); setErrorStats(null)
    getCodeStats(codeId)
      .then(setStats)
      .catch(e => setErrorStats(e?.response?.data?.detail || 'Не вдалося завантажити статистику'))
      .finally(() => setLoadingStats(false))
  }, [codeId])

  // завантаження списку подій та поточних налаштувань коду
  useEffect(() => {
    if (!codeId) return
    let dead = false
    async function load() {
      try {
        setLoadingAccess(true); setErrorAccess(null)

        // 1) події для селекту
        const evResp = await adminApi.get('/api/admin/events', { params: { page: 1, page_size: 500 } })
        const raw = evResp.data
        const list = Array.isArray(raw) ? raw : (raw?.items ?? [])
        const items: EventItem[] = list.map((e: any) => ({
          id: e.id,
          title: e.title,
          slug: e.slug,
        }))
        setEvents(items)
        if (dead) return
        setEvents(items)

        // 2) дані коду (щоб отримати allow_all_events та allowed_event_ids)
        const codeResp = await adminApi.get<CodeDetailsResp>(`/api/admin/codes/${codeId}`)
        const allowAllFlag = Boolean(codeResp.data?.allow_all_events)
        const allowedIds = (codeResp.data?.allowed_event_ids || []) as number[]

        if (dead) return
        setAllowAll(allowAllFlag)
        setSelectedIds(allowedIds)
      } catch (e:any) {
        if (dead) return
        setErrorAccess(e?.response?.data?.detail || 'Не вдалося завантажити налаштування доступу')
      } finally {
        if (!dead) setLoadingAccess(false)
      }
    }
    load()
    return () => { dead = true }
  }, [codeId])

  async function saveAccess() {
    if (!codeId) return
    setSavingAccess(true); setSavedOk(false); setErrorAccess(null)
    try {
      await adminApi.post(`/api/admin/codes/${codeId}/allow_events`, {
        allow_all: allowAll,
        event_ids: allowAll ? [] : selectedIds,
      })
      setSavedOk(true)
      // невеликий автозброс прапорця “збережено”
      setTimeout(() => setSavedOk(false), 2000)
    } catch (e:any) {
      setErrorAccess(e?.response?.data?.detail || 'Не вдалося зберегти доступ')
    } finally {
      setSavingAccess(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Код #{id}</h1>
        <Link to="/api/admin/codes" className="text-sm text-slate-500 hover:underline">← До списку кодів</Link>
      </div>

      {/* Статистика */}
      {loadingStats && <div>Завантаження статистики…</div>}
      {errorStats && <div className="text-red-600">{errorStats}</div>}
      {stats && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white shadow">
            <div className="text-slate-500">Сесій</div>
            <div className="text-3xl font-bold">{stats.sessions}</div>
          </div>
          <div className="p-4 rounded-xl bg-white shadow">
            <div className="text-slate-500">Перегляд (сек)</div>
            <div className="text-3xl font-bold">{stats.watch_seconds}</div>
          </div>
          <div className="p-4 rounded-xl bg-white shadow">
            <div className="text-slate-500">Трафік (байт)</div>
            <div className="text-3xl font-bold">{stats.bytes_out}</div>
          </div>
        </div>
      )}

      {/* Доступ до подій */}
      <div className="p-4 rounded-xl bg-white shadow space-y-3">
        <div className="text-lg font-semibold">Доступ до подій</div>

        {loadingAccess && <div>Завантаження параметрів…</div>}
        {errorAccess && <div className="text-red-600">{errorAccess}</div>}

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allowAll}
            onChange={e => setAllowAll(e.target.checked)}
          />
          <span>Безліміт на всі події</span>
        </label>

        <div>
          <div className="text-sm mb-1">Дозволені події (мультивибір)</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Дозволені події</div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allowAll}
                  onChange={e => setAllowAll(e.target.checked)}
                />
                <span>Безліміт на всі події</span>
              </label>
            </div>
            <DualList
              leftTitle="Доступні"
              rightTitle="Дозволені"
              left={leftItems}
              right={rightItems}
              onChange={(ids) => setSelectedIds(ids)}
              disabled={allowAll}
            />

            <div className="text-xs text-slate-500">
              Порада: подвійний клік переносить елемент між списками. Або виділяй чекбоксами і тисни стрілки.
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={saveAccess}
                disabled={savingAccess}
                className="px-4 py-2 rounded bg-slate-900 text-white disabled:opacity-50"
              >
                {savingAccess ? 'Збереження…' : 'Зберегти доступ'}
              </button>
              {savedOk && <span className="text-green-600 text-sm">Збережено</span>}
            </div>
          </div>

          <div className="text-xs text-slate-500 mt-1">
            Утримуйте Ctrl/Command для вибору кількох.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={saveAccess}
            disabled={savingAccess}
            className="px-4 py-2 rounded bg-slate-900 text-white disabled:opacity-50"
          >
            {savingAccess ? 'Збереження…' : 'Зберегти доступ'}
          </button>
          {savedOk && <span className="text-green-600 text-sm">Збережено</span>}
        </div>
      </div>
    </div>
  )
}
