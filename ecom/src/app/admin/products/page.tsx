'use client'
import { useEffect, useState } from 'react'
import { productService } from '@/lib/api'
import type { Product, Category } from '@/types'
import ProductForm from '@/features/products/ProductForm'

export default function ProductsPage() {
  const [products, setProducts]= useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch]= useState('')
  const [catId, setCatId]= useState<number | undefined>()
  const [showForm, setShowForm]= useState(false)
  const [editing, setEditing]= useState<Product | null>(null)
  const [showCatForm, setShowCatForm]= useState(false)
  const [newCatName, setNewCatName]= useState('')
  const [loading, setLoading]= useState(true)

  const load = async () => {
    setLoading(true)
    const [pRes, cRes] = await Promise.all([
      productService.list(search || undefined, catId),
      productService.listCategories(),
    ])
    if (pRes.success) setProducts(pRes.data)
    if (cRes.success) setCategories(cRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [search, catId])

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this product?')) return
    await productService.delete(id)
    load()
  }

  const handleCreateCat = async () => {
    if (!newCatName.trim()) return
    await productService.createCategory(newCatName)
    setNewCatName(''); setShowCatForm(false); load()
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight">Products</h1>
          <p className="text-sm text-slate-500 mt-0.5">{products.length} products in catalog</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCatForm(true)}
            className="px-3.5 py-2 bg-white/[0.05] border border-white/[0.08] text-slate-400 hover:text-white text-sm font-medium rounded-xl transition-colors">
            + Category
          </button>
          <button onClick={() => { setEditing(null); setShowForm(true) }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-500/20">
            + Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" placeholder="Search products…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500/40 transition-colors" />
        </div>
        <select value={catId ?? ''} onChange={e => setCatId(e.target.value ? Number(e.target.value) : undefined)}
          className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-slate-400 focus:outline-none focus:border-indigo-500/40">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#10121a] border border-white/[0.06] rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Product', 'Category', 'Variants / Price', 'Cost', 'Stock', 'Actions'].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-5 py-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-3.5 bg-white/[0.04] rounded-lg animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-20">
                  <div className="text-4xl mb-3">📦</div>
                  <p className="text-slate-600 text-sm">No products yet</p>
                  <button onClick={() => { setEditing(null); setShowForm(true) }}
                    className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm">Add your first product →</button>
                </td>
              </tr>
            ) : products.map(product => (
              <tr key={product.id} className="hover:bg-white/[0.015] transition-colors group">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    {product.image_url ? (
                      <img src={product.image_url} className="w-9 h-9 rounded-lg object-cover bg-white/5" alt="" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-600">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-200">{product.name}</p>
                      {product.barcode && <p className="text-[11px] text-slate-600 font-mono">{product.barcode}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  {product.category ? (
                    <span className="text-[11px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-full font-medium">
                      {product.category.name}
                    </span>
                  ) : <span className="text-slate-700 text-xs">—</span>}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {product.variants.map(v => (
                      <span key={v.id} className="text-[11px] bg-white/[0.04] text-slate-400 border border-white/[0.06] px-2 py-0.5 rounded-lg">
                        {v.name} · <span className="text-slate-300">${v.sale_price.toFixed(2)}</span>
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm text-slate-500">${product.cost_price.toFixed(2)}</td>
                <td className="px-5 py-3.5">
                  {product.variants.map(v => (
                    <div key={v.id} className="flex items-center gap-1.5 text-xs">
                      <span className={`w-1.5 h-1.5 rounded-full ${v.is_low_stock ? 'bg-red-400' : 'bg-emerald-400'}`} />
                      <span className={v.is_low_stock ? 'text-red-400' : 'text-slate-400'}>{v.stock_qty}</span>
                    </div>
                  ))}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditing(product); setShowForm(true) }}
                      className="text-[11px] px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors font-medium">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(product.id)}
                      className="text-[11px] px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors font-medium">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Category modal */}
      {showCatForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#10121a] border border-white/[0.08] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-white mb-4">New Category</h3>
            <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateCat()}
              placeholder="Category name"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setShowCatForm(false)} className="flex-1 py-2.5 border border-white/[0.08] rounded-xl text-sm text-slate-500 hover:bg-white/[0.04]">Cancel</button>
              <button onClick={handleCreateCat} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium">Create</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <ProductForm product={editing} categories={categories}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load() }} />
      )}
    </div>
  )
}
