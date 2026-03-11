// Auth
export interface User {
  id: number
  full_name: string
  email: string
  phone?: string
  role: 'cashier' | 'admin' | 'superadmin'
  is_active: boolean
  created_at: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
}

// Products
export interface Category {
  id: number
  name: string
  description?: string
}

export interface ProductVariant {
  id: number
  name: string
  sku?: string
  sale_price: number
  stock_qty: number
  min_stock_qty: number
  is_low_stock: boolean
}

export interface Product {
  id: number
  name: string
  description?: string
  barcode?: string
  image_url?: string
  cost_price: number
  is_active: boolean
  category?: Category
  variants: ProductVariant[]
  created_at: string
}

// Inventory
export interface InventoryLog {
  id: number
  change_qty: number
  type: 'in' | 'out'
  note: string
  created_by?: number
  created_at: string
}

export interface LowStockAlert {
  variant_id: number
  variant_name: string
  sku?: string
  stock_qty: number
  min_stock_qty: number
  units_needed: number
  product: {
    id: number
    name: string
    image_url?: string
    category?: string
  }
}

// Cart / Orders
export interface CartItem {
  variant: ProductVariant
  product: Product
  qty: number
}

export interface Order {
  order_id: number
  total_usd: number
  total_khr: number
  exchange_rate: number
  payment_method: 'cash' | 'khqr'
  change_usd?: number
  created_at: string
}

// Analytics
export interface AnalyticsSummary {
  period: string
  total_volume: number
  total_revenue_usd: number
  total_cost_usd: number
  net_profit_usd: number
  profit_margin_pct: number
}

export interface TrendPoint {
  date: string
  volume: number
  revenue: number
  cost: number
  profit: number
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}
