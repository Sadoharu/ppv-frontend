// src/pages/Admins.tsx
import { useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import DataTable from '@/components/DataTable'
import { fetchAdmins, createAdmin, updateAdmin, deleteAdmin, AdminUser } from '@/api/admin'
import { useAuth } from '@/state/auth'

// Хелпер для форматування помилок від FastAPI/Pydantic
function formatError(err: any): string {
  if (!err) return ''
  
  // Якщо є відповідь від сервера
  const responseData = err.response?.data
  const detail = responseData?.detail

  // 1. Pydantic validation error (Array of objects)
  if (Array.isArray(detail)) {
    return detail
      .map((d: any) => {
        // d.loc зазвичай ["body", "field_name"], беремо останнє
        const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : ''
        return field ? `${field}: ${d.msg}` : d.msg
      })
      .join('; ')
  }

  // 2. Звичайна помилка (String)
  if (typeof detail === 'string') {
    return detail
  }

  // 3. Fallback
  return err.message || 'Сталася невідома помилка'
}

export default function Admins() {
  const { role: myRole } = useAuth()
  const [items, setItems] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(false)
  
  // Modal state
  const [isModalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AdminUser | null>(null)
  
  // Form state
  const [formEmail, setFormEmail] = useState('')
  const [formPass, setFormPass] = useState('')
  const [formRole, setFormRole] = useState('manager')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canManage = myRole === 'super'

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchAdmins()
      setItems(data)
    } catch (e) {
      console.error('Failed to load admins', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canManage) load()
  }, [canManage])

  const handleOpenCreate = () => {
    setEditingItem(null)
    setFormEmail('')
    setFormPass('')
    setFormRole('manager')
    setError(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (user: AdminUser) => {
    setEditingItem(user)
    setFormEmail(user.email)
    setFormPass('') // password blank means no change
    setFormRole(user.role)
    setError(null)
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Видалити цього адміністратора?')) return
    try {
      await deleteAdmin(id)
      load()
    } catch (e: any) {
      alert(formatError(e))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload: any = { email: formEmail, role: formRole }
      if (formPass) payload.password = formPass

      if (editingItem) {
        await updateAdmin(editingItem.id, payload)
      } else {
        await createAdmin(payload)
      }
      setModalOpen(false)
      load()
    } catch (err: any) {
      // ТУТ БУЛА ПОМИЛКА: тепер використовуємо formatError
      setError(formatError(err))
    } finally {
      setSaving(false)
    }
  }

  const columns: ColumnDef<AdminUser>[] = [
    { accessorKey: 'id', header: 'ID', size: 50 },
    { accessorKey: 'email', header: 'Email' },
    { 
      accessorKey: 'role', 
      header: 'Роль',
      cell: info => <span className="px-2 py-0.5 rounded bg-slate-100 text-xs font-bold uppercase">{info.getValue() as string}</span>
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const user = row.original
        if (!canManage) return null
        return (
          <div className="flex gap-2 justify-end">
            <button onClick={() => handleOpenEdit(user)} className="text-blue-600 text-sm hover:underline">Ред.</button>
            <button onClick={() => handleDelete(user.id)} className="text-red-600 text-sm hover:underline">Вид.</button>
          </div>
        )
      }
    }
  ]

  if (!canManage) {
    return <div className="p-6 text-slate-500">Доступ заборонено (тільки Super Admin)</div>
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Адміністратори</h1>
        <button onClick={handleOpenCreate} className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800">
          + Додати адміна
        </button>
      </div>

      {loading ? (
        <div>Завантаження...</div>
      ) : (
        <DataTable data={items} columns={columns} />
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
          <div className="bg-white rounded-xl shadow p-6 w-[400px]">
            <h2 className="text-lg font-semibold mb-4">{editingItem ? 'Редагування' : 'Новий адмін'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input 
                  required 
                  type="email" 
                  className="border rounded px-3 py-2 w-full"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Пароль {editingItem && <span className="text-slate-400 font-normal">(порожній = без змін)</span>}</label>
                <input 
                  type="password" 
                  className="border rounded px-3 py-2 w-full"
                  value={formPass}
                  onChange={e => setFormPass(e.target.value)}
                  placeholder={editingItem ? '******' : 'Введіть пароль'}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Роль</label>
                <select 
                  className="border rounded px-3 py-2 w-full"
                  value={formRole}
                  onChange={e => setFormRole(e.target.value)}
                >
                  <option value="manager">Manager (Контент)</option>
                  <option value="support">Support (Підтримка)</option>
                  <option value="admin">Admin (Без керування юзерами)</option>
                  <option value="super">Super Admin (Повний доступ)</option>
                  <option value="analyst">Analyst (Тільки перегляд)</option>
                </select>
              </div>

              {/* Безпечний рендер помилки */}
              {error && (
                <div className="p-2 bg-red-50 text-red-700 text-sm rounded border border-red-200">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border rounded">Скасувати</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-slate-900 text-white rounded">
                  {saving ? '...' : 'Зберегти'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}