import EventForm from '@/components/events/EventForm'
import { createEvent, type AdminEvent } from '@/api/adminEvents'
import { useState } from 'react'

type Props = { open: boolean; onClose: () => void; onCreated: () => void | Promise<void> }

export default function CreateEventModal({ open, onClose, onCreated }: Props) {
  const [saving, setSaving] = useState(false)
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
      <div className="bg-white rounded-xl shadow p-6 w-[820px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Створити подію</h2>
          <button onClick={onClose} className="text-slate-500">✕</button>
        </div>

        <EventForm
          saving={saving}
          onCancel={onClose}
          submitLabel="Створити"
          onSubmit={async (payload: Partial<AdminEvent>) => {
            setSaving(true)
            try {
              await createEvent(payload)
              await onCreated()
              onClose()
            } finally {
              setSaving(false)
            }
          }}
        />
      </div>
    </div>
  )
}
