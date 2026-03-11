'use client'
import { useEffect, useState } from 'react'
import { productService } from '@/lib/api'
import type { Product, Category } from '@/types'
import ProductForm from '@/features/products/ProductForm'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const [pRes, cRes] = await Promise.all([
      productService.list(search, categoryId),
      productService.listCategories(),
    ])
    if (pRes.success) setProducts(pRes.data)
    if (cRes.success) setCategories(cRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [search, categoryId])

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this product?')) return
    await productService.delete(id)
    load()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium"
        >
          + Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded-lg px-4 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <select
          value={categoryId ?? ''}
          onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No products found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(product => (
            <div key={product.id} className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-300 text-4xl">📦</div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{product.name}</h3>
                    {product.category && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                        {product.category.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-2 space-y-1">
                  {product.variants.map(v => (
                    <div key={v.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">{v.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">${v.sale_price.toFixed(2)}</span>
                        <span className={`text-xs px-1.5 rounded ${v.is_low_stock ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                          {v.stock_qty}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {product.barcode && (
                  <p className="text-xs text-gray-400 mt-2">#{product.barcode}</p>
                )}

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => { setEditing(product); setShowForm(true) }}
                    className="flex-1 text-sm border border-indigo-300 text-indigo-600 rounded-lg py-1.5 hover:bg-indigo-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="flex-1 text-sm border border-red-300 text-red-500 rounded-lg py-1.5 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <ProductForm
          product={editing}
          categories={categories}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load() }}
        />
      )}
    </div>
  )
}
