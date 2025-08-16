import { useEffect, useMemo, useState } from 'react'
import api from '@/api/adminClient'
import DataTable from '@/components/DataTable'
import { ColumnDef } from '@tanstack/react-table'

type Code = {
  id: string
  code_plain: string
  active: boolean
  max_concurrent_sessions?: number
  cooldown_seconds?: number
  created_at?: string
}

export default function Codes() {
  const [rows, setRows] = useState<Code[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get('/api/admin/codes/list')
      .then(r => setRows(r.data.items || r.data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [])

  const cols = useMemo<ColumnDef<Code>[]>(() => [
    { header: 'Код', accessorKey: 'code_plain' },
    { header: 'Активний', accessorKey: 'active', cell: ({ getValue }) => getValue() ? 'так' : 'ні' },
    { header: 'Макс. сесій', accessorKey: 'max_concurrent_sessions' },
    { header: 'Cooldown, с', accessorKey: 'cooldown_seconds' },
    { header: 'Створено', accessorKey: 'created_at' },
  ], [])

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Коди доступу</h1>
      {loading ? 'Завантаження...' : <DataTable data={rows} columns={cols} />}
    </div>
  )
}
