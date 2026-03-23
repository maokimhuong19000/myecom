'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { productService } from '@/lib/api'
import type { Product, Category } from '@/types'
import { useCart } from '../layout'

function ProductCard({ product }: { product: Product }) {
  const { add } = useCart()
  const [hovered, setHovered] = useState(false)
  const variant = product.variants[0]

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!variant) return
    add({ id: product.id, variantId: variant.id, name: product.name, variant: variant.name, price: variant.sale_price, image: product.image_url })
  }

  return (
    <Link href={`/store/product/${product.id}`} className="group"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="relative aspect-[3/4] bg-stone-100 rounded-2xl overflow-hidden mb-3">
        {product.image_url
          ? <img src={product.image_url ? (product.image_url.startsWith("http") ? product.image_url : `http://localhost${product.image_url.replace("/api/products/uploads/", "/api/products/catalog/uploads/")}`) : ""} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          : <div className="w-full h-full flex items-center justify-center text-stone-300 text-4xl">👗</div>
        }
        <div className={`absolute inset-x-0 bottom-0 p-3 transition-all duration-300 ${hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <button onClick={handleAdd} className="w-full bg-black text-white text-xs font-bold py-3 rounded-xl tracking-widest uppercase hover:bg-stone-800 transition-colors">
            Add to Cart
          </button>
        </div>
        {product.category && (
          <div className="absolute top-3 left-3">
            <span className="text-[10px] font-bold bg-white/90 text-stone-600 px-2 py-1 rounded-full uppercase tracking-wider">
              {product.category.name}
            </span>
          </div>
        )}
        {variant?.is_low_stock && (
          <div className="absolute top-3 right-3">
            <span className="text-[10px] font-bold bg-red-500 text-white px-2 py-1 rounded-full">Low Stock</span>
          </div>
        )}
      </div>
      <div className="px-1">
        <p className="text-xs text-stone-400 uppercase tracking-wider mb-0.5">{product.category?.name ?? 'Fashion'}</p>
        <p className="text-sm font-semibold text-stone-900 truncate">{product.name}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm font-bold">${variant?.sale_price.toFixed(2) ?? '—'}</p>
          {product.variants.length > 1 && <p className="text-xs text-stone-400">{product.variants.length} options</p>}
        </div>
      </div>
    </Link>
  )
}

const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Name A-Z', value: 'name' },
]

export default function ShopPage() {
  const [products,   setProducts]   = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search,     setSearch]     = useState('')
  const [catId,      setCatId]      = useState<number | undefined>()
  const [sort,       setSort]       = useState('newest')
  const [loading,    setLoading]    = useState(true)
  const [showFilter, setShowFilter] = useState(false)

  useEffect(() => {
    Promise.all([
      productService.list(search || undefined, catId),
      productService.listCategories(),
    ]).then(([p, c]) => {
      if (p.success) setProducts(p.data)
      if (c.success) setCategories(c.data)
      setLoading(false)
    })
  }, [search, catId])

  const sorted = [...products].sort((a, b) => {
    if (sort === 'price_asc') return (a.variants[0]?.sale_price ?? 0) - (b.variants[0]?.sale_price ?? 0)
    if (sort === 'price_desc') return (b.variants[0]?.sale_price ?? 0) - (a.variants[0]?.sale_price ?? 0)
    if (sort === 'name') return a.name.localeCompare(b.name)
    return b.id - a.id
  })

  return (
    <div className="max-w-7xl mx-auto px-6 py-10" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-widest mb-1">Collection</p>
          <h1 className="text-4xl font-black text-stone-900 tracking-tight">All Products</h1>
          <p className="text-stone-400 text-sm mt-1">{products.length} items</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="text-sm border border-stone-200 rounded-xl px-4 py-2.5 text-stone-600 focus:outline-none focus:border-stone-400 bg-white">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={() => setShowFilter(!showFilter)}
            className="flex items-center gap-2 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Filter
          </button>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar filter */}
        <aside className={`flex-shrink-0 w-52 transition-all duration-300 ${showFilter ? 'block' : 'hidden'}`}>
          <div className="sticky top-24 space-y-6">
            {/* Search */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">Search</p>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl pl-8 pr-3 py-2.5 text-sm text-stone-700 focus:outline-none focus:border-stone-400 placeholder-stone-300" />
              </div>
            </div>

            {/* Categories */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">Category</p>
              <div className="space-y-1">
                <button onClick={() => setCatId(undefined)}
                  className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${!catId ? 'bg-black text-white font-semibold' : 'text-stone-600 hover:bg-stone-100'}`}>
                  All
                </button>
                {categories.map(c => (
                  <button key={c.id} onClick={() => setCatId(c.id)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${catId === c.id ? 'bg-black text-white font-semibold' : 'text-stone-600 hover:bg-stone-100'}`}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Grid */}
        <div className="flex-1">
          {/* Active filters */}
          {(search || catId) && (
            <div className="flex gap-2 mb-5 flex-wrap">
              {search && (
                <span className="flex items-center gap-1.5 bg-stone-100 text-stone-700 text-xs font-medium px-3 py-1.5 rounded-full">
                  &ldquo;{search}&rdquo;
                  <button onClick={() => setSearch('')} className="text-stone-400 hover:text-stone-700">×</button>
                </span>
              )}
              {catId && (
                <span className="flex items-center gap-1.5 bg-stone-100 text-stone-700 text-xs font-medium px-3 py-1.5 rounded-full">
                  {categories.find(c => c.id === catId)?.name}
                  <button onClick={() => setCatId(undefined)} className="text-stone-400 hover:text-stone-700">×</button>
                </span>
              )}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-[3/4] bg-stone-100 rounded-2xl animate-pulse" />
                  <div className="h-3 bg-stone-100 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-stone-100 rounded animate-pulse w-1/2" />
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-24 text-stone-400">
              <div className="text-5xl mb-4">🔍</div>
              <p className="font-medium">No products found</p>
              <button onClick={() => { setSearch(''); setCatId(undefined) }}
                className="mt-3 text-sm underline underline-offset-4">Clear filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {sorted.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
