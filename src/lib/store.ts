import { create } from 'zustand'

export type Page = 'dashboard' | 'customers' | 'customer-profile' | 'sales' | 'products' | 'suppliers' | 'reports' | 'backup' | 'users' | 'settings' | 'expenses'

interface User {
  id: string
  name: string
  role: string
}

interface AppState {
  currentUser: User | null
  currentPage: Page
  sidebarOpen: boolean
  selectedCustomerId: string | null
  hydrated: boolean
  // Actions
  setUser: (user: User | null) => void
  setPage: (page: Page) => void
  setSidebarOpen: (open: boolean) => void
  setSelectedCustomerId: (id: string | null) => void
  logout: () => Promise<void>
  hydrate: () => void
  verifySession: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  currentPage: 'dashboard',
  sidebarOpen: false,
  selectedCustomerId: null,
  hydrated: false,
  setUser: (user) => {
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('showroom_user', JSON.stringify(user))
      } else {
        localStorage.removeItem('showroom_user')
      }
    }
    set({ currentUser: user })
  },
  setPage: (page) => set({ currentPage: page, sidebarOpen: false }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSelectedCustomerId: (id) => set({ selectedCustomerId: id, currentPage: 'customer-profile' }),
  logout: async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' })
    } catch {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('showroom_user')
    }
    set({ currentUser: null, currentPage: 'dashboard', sidebarOpen: false, selectedCustomerId: null })
  },
  hydrate: () => {
    if (typeof window !== 'undefined') {
      // Fast initial load from cache for instant render
      const stored = localStorage.getItem('showroom_user')
      if (stored) {
        try {
          set({ currentUser: JSON.parse(stored), hydrated: true })
        } catch {
          set({ hydrated: true })
        }
      } else {
        set({ hydrated: true })
      }
      // Then verify with server to correct any localStorage tampering
      get().verifySession()
    }
  },
  verifySession: async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) {
        // Session invalid - clear everything
        if (typeof window !== 'undefined') {
          localStorage.removeItem('showroom_user')
        }
        set({ currentUser: null, hydrated: true })
        return
      }
      const user = await res.json()
      // Update with server-verified data (correct role)
      if (typeof window !== 'undefined') {
        localStorage.setItem('showroom_user', JSON.stringify(user))
      }
      set({ currentUser: user, hydrated: true })
    } catch {
      set({ hydrated: true })
    }
  },
}))
