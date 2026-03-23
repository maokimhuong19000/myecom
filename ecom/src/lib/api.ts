import type { ApiResponse, User, AuthTokens, Product, Category, InventoryLog, LowStockAlert, Order, AnalyticsSummary, TrendPoint } from '@/types'

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000/api/auth'
const PRODUCT_URL = process.env.NEXT_PUBLIC_PRODUCT_URL || 'http://localhost/api/products'
const CATALOG_URL = `${PRODUCT_URL}/catalog`

// ─── Token Management ────────────────────────────────────────────────────────

export const tokenStore = {
  get: () => typeof window !== 'undefined' ? localStorage.getItem('access_token') : null,
  set: (t: string) => localStorage.setItem('access_token', t),
  getRefresh: () => typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null,
  setRefresh: (t: string) => localStorage.setItem('refresh_token', t),
  clear: () => { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token') },
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = tokenStore.get()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(url, { ...options, headers })

  if (res.status === 401) {
    const refresh = tokenStore.getRefresh()
    if (refresh) {
      const refreshRes = await fetch(`${AUTH_URL}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
      })
      if (refreshRes.ok) {
        const data = await refreshRes.json()
        tokenStore.set(data.data.access_token)
        return apiFetch<T>(url, options)
      }
    }
    tokenStore.clear()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  return res.json()
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

export const authService = {
  login: async (email: string, password: string) => {
    const res = await apiFetch<User & AuthTokens>(`${AUTH_URL}/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (res.success) {
      tokenStore.set(res.data.access_token)
      tokenStore.setRefresh(res.data.refresh_token)
    }
    return res
  },

  register: async (payload: { full_name: string; email: string; password: string; phone?: string; role?: string }) => {
    return apiFetch<User & AuthTokens>(`${AUTH_URL}/register`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  me: () => apiFetch<User>(`${AUTH_URL}/me`),
  logout: () => tokenStore.clear(),

  changePassword: (old_password: string, new_password: string) =>
    apiFetch(`${AUTH_URL}/change-password`, {
      method: 'POST',
      body: JSON.stringify({ old_password, new_password }),
    }),
}

// ─── Product Service ──────────────────────────────────────────────────────────

export const productService = {
  list: (search?: string, category_id?: number) => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category_id) params.set('category_id', String(category_id))
    return apiFetch<Product[]>(`${CATALOG_URL}/?${params}`)
  },

  get: (id: number) => apiFetch<Product>(`${CATALOG_URL}/${id}`),

  getByBarcode: (code: string) => apiFetch<Product>(`${CATALOG_URL}/barcode/${code}`),

  create: (payload: any) =>
    apiFetch<Product>(`${CATALOG_URL}/`, { method: 'POST', body: JSON.stringify(payload) }),

  update: (id: number, payload: any) =>
    apiFetch<Product>(`${CATALOG_URL}/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  delete: (id: number) => apiFetch(`${CATALOG_URL}/${id}`, { method: 'DELETE' }),

  listCategories: () => apiFetch<Category[]>(`${CATALOG_URL}/categories`),

  createCategory: (name: string, description?: string) =>
    apiFetch<Category>(`${CATALOG_URL}/categories`, {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),
}

// ─── Inventory Service ────────────────────────────────────────────────────────

export const inventoryService = {
  adjust: (variant_id: number, change_qty: number, note: string) =>
    apiFetch(`${PRODUCT_URL}/inventory/adjust`, {
      method: 'POST',
      body: JSON.stringify({ variant_id, change_qty, note }),
    }),

  getLogs: (variant_id: number) =>
    apiFetch<InventoryLog[]>(`${PRODUCT_URL}/inventory/logs/${variant_id}`),

  getAlerts: () => apiFetch<LowStockAlert[]>(`${PRODUCT_URL}/inventory/alerts`),
}

// ─── Order Service ────────────────────────────────────────────────────────────

export const orderService = {
  checkout: (payload: {
    items: { variant_id: number; qty: number }[]
    payment_method: 'cash' | 'khqr'
    cash_tendered_usd?: number
    exchange_rate?: number
  }) =>
    apiFetch<Order>(`${PRODUCT_URL}/orders/checkout`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  list: () => apiFetch<Order[]>(`${PRODUCT_URL}/orders`),
}

// ─── Analytics Service ────────────────────────────────────────────────────────

export const analyticsService = {
  summary: (period: string = 'month') =>
    apiFetch<AnalyticsSummary>(`${PRODUCT_URL}/analytics/summary?period=${period}`),

  trends: (period: string = 'week') =>
    apiFetch<{ period: string; label: string; series: TrendPoint[] }>(
      `${PRODUCT_URL}/analytics/trends?period=${period}`
    ),

  topProducts: (period: string = 'month', limit = 10) =>
    apiFetch<any[]>(`${PRODUCT_URL}/analytics/top-products?period=${period}&limit=${limit}`),
}
export function getImageUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `http://localhost${url}`
}

