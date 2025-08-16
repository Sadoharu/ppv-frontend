import { create } from 'zustand'

type Role = 'admin' | 'manager' | 'support' | 'analyst' | 'guest'
type AuthState = {
  isAuthenticated: boolean
  access?: string
  refresh?: string
  sessionId?: string
  role: Role
  setAuth: (p: Partial<AuthState>) => void
  logout: () => void
}

// ① initial from localStorage
const saved = (() => {
  try { return JSON.parse(localStorage.getItem('auth') || '{}') } catch { return {} }
})()

export const useAuth = create<AuthState>((set) => ({
  isAuthenticated: !!saved?.access,
  access: saved?.access,
  role: (saved?.role as Role) || 'guest',
  setAuth: (p) => set((s) => {
    const next = { ...s, ...p }
    localStorage.setItem('auth', JSON.stringify(next))
    return next
  }),
  logout: () => {
    localStorage.removeItem('auth')
    set({ isAuthenticated: false, access: undefined, refresh: undefined, sessionId: undefined, role: 'guest' })
  },
}))
