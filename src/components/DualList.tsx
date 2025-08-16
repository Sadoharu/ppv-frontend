import { useMemo, useState } from 'react'

export type DualListItem = { id: number; label: string }

type Props = {
  leftTitle?: string
  rightTitle?: string
  left: DualListItem[]          // доступні
  right: DualListItem[]         // обрані (дозволені)
  onChange: (nextRightIds: number[]) => void
  disabled?: boolean
}

export default function DualList({ leftTitle='Доступні', rightTitle='Дозволені', left, right, onChange, disabled }: Props) {
  const [qLeft, setQLeft] = useState('')
  const [qRight, setQRight] = useState('')
  const [selLeft, setSelLeft] = useState<Set<number>>(new Set())
  const [selRight, setSelRight] = useState<Set<number>>(new Set())

  const filteredLeft = useMemo(
    () => left.filter(i => i.label.toLowerCase().includes(qLeft.toLowerCase())),
    [left, qLeft]
  )
  const filteredRight = useMemo(
    () => right.filter(i => i.label.toLowerCase().includes(qRight.toLowerCase())),
    [right, qRight]
  )

  function moveLeftToRight(ids: number[]) {
    if (disabled || ids.length === 0) return
    const set = new Set(right.map(i => i.id))
    ids.forEach(id => set.add(id))
    onChange([...set])
    setSelLeft(new Set())
  }
  function moveRightToLeft(ids: number[]) {
    if (disabled || ids.length === 0) return
    const set = new Set(right.map(i => i.id))
    ids.forEach(id => set.delete(id))
    onChange([...set])
    setSelRight(new Set())
  }

  return (
    <div className={`grid md:grid-cols-[1fr_auto_1fr] grid-cols-1 gap-3 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* Ліва колонка */}
      <div className="rounded-xl border bg-white">
        <div className="px-3 py-2 border-b flex items-center gap-2">
          <div className="font-medium">{leftTitle}</div>
          <input
            className="ml-auto border rounded px-2 py-1 text-sm"
            placeholder="Пошук…"
            value={qLeft}
            onChange={e=>setQLeft(e.target.value)}
          />
        </div>
        <ul className="max-h-64 overflow-auto">
          {filteredLeft.map(item => {
            const checked = selLeft.has(item.id)
            return (
              <li
                key={item.id}
                className="px-3 py-2 border-b last:border-b-0 flex items-center gap-2 cursor-pointer hover:bg-slate-50"
                onDoubleClick={() => moveLeftToRight([item.id])}
                onClick={() => {
                  const next = new Set(selLeft)
                  checked ? next.delete(item.id) : next.add(item.id)
                  setSelLeft(next)
                }}
              >
                <input type="checkbox" readOnly checked={checked} />
                <span className="text-sm">{item.label}</span>
              </li>
            )
          })}
          {filteredLeft.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">Нічого не знайдено</li>
          )}
        </ul>
      </div>

      {/* Кнопки переносу */}
      <div className="grid gap-2 place-content-center">
        <button
          type="button"
          className="px-3 py-2 rounded bg-slate-900 text-white disabled:opacity-50"
          onClick={() => moveLeftToRight([...selLeft])}
          disabled={selLeft.size === 0 || disabled}
          title="Додати →"
        >
          →
        </button>
        <button
          type="button"
          className="px-3 py-2 rounded bg-slate-900 text-white disabled:opacity-50"
          onClick={() => moveRightToLeft([...selRight])}
          disabled={selRight.size === 0 || disabled}
          title="← Прибрати"
        >
          ←
        </button>
      </div>

      {/* Права колонка */}
      <div className="rounded-xl border bg-white">
        <div className="px-3 py-2 border-b flex items-center gap-2">
          <div className="font-medium">{rightTitle}</div>
          <input
            className="ml-auto border rounded px-2 py-1 text-sm"
            placeholder="Пошук…"
            value={qRight}
            onChange={e=>setQRight(e.target.value)}
          />
        </div>
        <ul className="max-h-64 overflow-auto">
          {filteredRight.map(item => {
            const checked = selRight.has(item.id)
            return (
              <li
                key={item.id}
                className="px-3 py-2 border-b last:border-b-0 flex items-center gap-2 cursor-pointer hover:bg-slate-50"
                onDoubleClick={() => moveRightToLeft([item.id])}
                onClick={() => {
                  const next = new Set(selRight)
                  checked ? next.delete(item.id) : next.add(item.id)
                  setSelRight(next)
                }}
              >
                <input type="checkbox" readOnly checked={checked} />
                <span className="text-sm">{item.label}</span>
              </li>
            )
          })}
          {filteredRight.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">Порожньо</li>
          )}
        </ul>
      </div>
    </div>
  )
}
