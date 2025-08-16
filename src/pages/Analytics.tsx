// src/pages/Analytics.tsx
import { useEffect, useState } from 'react'
import api from '@/api/adminClient'

export default function Analytics() {
  const [ccu, setCcu] = useState<any>(null)

  useEffect(() => {
    api.get('/api/admin/ccu')            // <-- ось тут
      .then(r => setCcu(r.data))
      .catch(() => setCcu(null))
  }, [])

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Аналітика</h1>
      <pre className="bg-white p-4 rounded-xl shadow overflow-auto">
        {JSON.stringify(ccu, null, 2)}
      </pre>
    </div>
  )
}
