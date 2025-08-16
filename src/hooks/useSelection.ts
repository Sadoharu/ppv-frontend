//done
import { useMemo, useState } from 'react'

export function useSelection(idsInView: number[]) {
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const allSelected = useMemo(
    () => idsInView.length > 0 && idsInView.every(id => selected.has(id)),
    [idsInView, selected]
  )

  const hasSelection = selected.size > 0
  const selectedIds = useMemo(() => Array.from(selected), [selected])

  function toggleOne(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(prev => {
      if (allSelected) return new Set()
      return new Set(idsInView)
    })
  }

  function clearSelection() { setSelected(new Set()) }

  // очищаємо вибір, якщо елементів більше нема на сторінці
  const keepExistingOnly = (nextIds: number[]) => {
    setSelected(prev => new Set(Array.from(prev).filter(id => nextIds.includes(id))))
  }

  return { selected, selectedIds, hasSelection, allSelected, toggleOne, toggleAll, clearSelection, keepExistingOnly }
}