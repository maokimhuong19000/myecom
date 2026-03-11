'use client'
import { useState } from 'react'
import { productService } from '@/lib/api'
import type { Product, Category } from '@/types'

interface Props {
  product: Product | null
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}

interface VariantRow {
  id?: number
  name: string
  sku: string
  sale_price: string
  stock_qty: string
  min_stock_qty: string
}

export default function ProductForm({ product, categories, onClose, onSaved }: Props) {
  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [barcode, setBarcode] = useState(product?.barcode ?? '')
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? '')
  const [costPrice, setCostPrice] = useState(String(product?.cost_price ?? ''))
  const [categoryId, setCategoryId] = useState(String(product?.category?.id ?? ''))
  const [variants, setVariants] = useState<VariantRow[]>(
    product?.variants.map(v => ({
      id: v.id,
      name: v.name,
      sku: v.sku ?? '',
      sale_price: String(v.sale_price),
      stock_qty: String(v.stock_qty),
      min_stock_qty: String(v.min_stock_qty),
    })) ?? [{ name: 'Default', sku: '', sale_price: '', stock_qty: '0', min_stock_qty: '5' }]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addVariant = () =>
    setVariants(prev => [...prev, { name: '', sku: '', sale_price: '', stock_qty: '0', min_stock_qty: '5' }])

  const removeVariant = (i: number) =>
    setVariants(prev => prev.filter((_, idx) => idx !== i))

  const updateVariant = (i: number, field: keyof VariantRow, value: string) =>
    setVariants(prev => prev.map((v, idx) => idx === i ? { ...v, [field]: value } : v))

  const handleSave = async () => {
    if (!name.trim()) return setError('Product name is required')
    if (variants.some(v => !v.name.trim() || !v.sale_price)) return setError('All variants need a name and price')

    setSaving(true)
    setError('')

    const payload = {
      name,
      description,
      barcode: barcode || undefined,
      image_url: imageUrl || undefined,
      cost_price: parseFloat(costPrice) || 0,
      category_id: categoryId ? parseInt(categoryId) : undefined,
      variants: variants.map(v => ({
        ...(v.id ? { id: v.id } : {}),
        name: v.name,
        sku: v.sku || undefined,
        sale_price: parseFloat(v.sale_price),
        stock_qty: parseInt(v.stock_qty) || 0,
        min_stock_qty: parseInt(v.min_stock_qty) || 5,
      })),
    }

    const res = product
      ? await productService.update(product.id, payload)
      : await productService.create(payload)

    setSaving(false)
    if (res.success) {
      onSaved()
    } else {
      setError(res.message || 'Failed to save product')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">{product ? 'Edit Product' : 'New Product'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">No category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (USD)</label>
              <input type="number" step="0.01" value={costPrice} onChange={e => setCostPrice(e.target.value)}
                placeholder="0.00"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
              <input value={barcode} onChange={e => setBarcode(e.target.value)}
                placeholder="Optional"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
              <input value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>

          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800">Variants</h3>
              <button onClick={addVariant}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                + Add Variant
              </button>
            </div>

            <div className="space-y-3">
              {variants.map((v, i) => (
                <div key={i} className="border rounded-xl p-3 bg-gray-50">
                  <div className="grid grid-cols-6 gap-2">
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500">Name *</label>
                      <input value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)}
                        placeholder="e.g. Large"
                        className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">SKU</label>
                      <input value={v.sku} onChange={e => updateVariant(i, 'sku', e.target.value)}
                        className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Price *</label>
                      <input type="number" step="0.01" value={v.sale_price}
                        onChange={e => updateVariant(i, 'sale_price', e.target.value)}
                        className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Min Stock</label>
                      <input type="number" value={v.min_stock_qty}
                        onChange={e => updateVariant(i, 'min_stock_qty', e.target.value)}
                        className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                    </div>
                    <div className="flex items-end">
                      {variants.length > 1 && (
                        <button onClick={() => removeVariant(i)}
                          className="w-full text-sm text-red-400 hover:text-red-600 border border-red-200 rounded py-1.5 hover:bg-red-50">
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t flex gap-3">
          <button onClick={onClose}
            className="flex-1 border rounded-lg py-2.5 text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 hover:bg-indigo-700 disabled:opacity-50 font-medium">
            {saving ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>
  )
}
