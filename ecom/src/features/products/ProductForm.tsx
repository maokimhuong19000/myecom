'use client'
import { useState, useRef } from 'react'
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

const PRODUCT_URL = process.env.NEXT_PUBLIC_PRODUCT_URL || 'http://localhost/api/products'

export default function ProductForm({ product, categories, onClose, onSaved }: Props) {
  const [name, setName]               = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [barcode, setBarcode]         = useState(product?.barcode ?? '')
  const [imageUrl, setImageUrl]       = useState(product?.image_url ?? '')
  const [costPrice, setCostPrice]     = useState(String(product?.cost_price ?? ''))
  const [categoryId, setCategoryId]   = useState(String(product?.category?.id ?? ''))
  const [variants, setVariants]       = useState<VariantRow[]>(
    product?.variants?.map(v => ({
      id: v.id,
      name: v.name,
      sku: v.sku ?? '',
      sale_price: String(v.sale_price),
      stock_qty: String(v.stock_qty),
      min_stock_qty: String(v.min_stock_qty),
    })) ?? [{ name: '', sku: '', sale_price: '', stock_qty: '0', min_stock_qty: '5' }]
  )
  const [saving, setSaving]           = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef                  = useRef<HTMLInputElement>(null)

  // ── Image upload ──────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    setUploading(true)
    try {
      const token = localStorage.getItem('access_token') || ''
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${PRODUCT_URL}/catalog/upload-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const data = await res.json()
      if (data.success) {
        setImageUrl(data.data.url)
      } else {
        setUploadError(data.detail || 'Upload failed')
      }
    } catch (err) {
      setUploadError('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // ── Variant helpers ───────────────────────────────────────
  const updateVariant = (i: number, field: keyof VariantRow, value: string) => {
    setVariants(prev => prev.map((v, idx) => idx === i ? { ...v, [field]: value } : v))
  }
  const addVariant = () => setVariants(prev => [...prev, { name: '', sku: '', sale_price: '', stock_qty: '0', min_stock_qty: '5' }])
  const removeVariant = (i: number) => setVariants(prev => prev.filter((_, idx) => idx !== i))

  // ── Save ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) return alert('Product name is required')
    setSaving(true)
    const payload = {
      name,
      description,
      barcode: barcode || undefined,
      image_url: imageUrl || undefined,
      cost_price: parseFloat(costPrice) || 0,
      category_id: categoryId ? parseInt(categoryId) : undefined,
      variants: variants
        .filter(v => v.name.trim())
        .map(v => ({
          id: v.id,
          name: v.name,
          sku: v.sku || undefined,
          sale_price: parseFloat(v.sale_price) || 0,
          stock_qty: parseInt(v.stock_qty) || 0,
          min_stock_qty: parseInt(v.min_stock_qty) || 5,
        })),
    }
    const res = product
      ? await productService.update(product.id, payload)
      : await productService.create(payload)
    setSaving(false)
    if (res.success) { onSaved(); onClose() }
    else alert(res.message || 'Save failed')
  }

  const inp = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500'
  const lbl = 'block text-xs text-slate-400 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">
            {product ? 'Edit Product' : 'New Product'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="px-6 py-4 space-y-5">

          {/* Image Upload */}
          <div>
            <label className={lbl}>Product Image</label>
            <div className="flex gap-3 items-start">
              {/* Preview */}
              <div
                className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0 bg-slate-800 cursor-pointer hover:border-blue-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl.startsWith('/api') ? `http://localhost${imageUrl}` : imageUrl}
                    alt="preview"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <div className="text-center">
                    <div className="text-2xl">📷</div>
                    <div className="text-xs text-slate-500 mt-1">Click to upload</div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  {uploading ? '⏳ Uploading...' : '📁 Upload from Device'}
                </button>
                <p className="text-xs text-slate-500">JPG, PNG, WEBP, GIF — max 5MB</p>
                {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
                {/* Or paste URL */}
                <input
                  className={inp}
                  placeholder="Or paste image URL..."
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={lbl}>Product Name *</label>
              <input className={inp} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Classic T-Shirt" />
            </div>
            <div>
              <label className={lbl}>Category</label>
              <select className={inp} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                <option value="">— No Category —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Cost Price (USD)</label>
              <input className={inp} type="number" step="0.01" min="0" value={costPrice} onChange={e => setCostPrice(e.target.value)} placeholder="0.00" />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Barcode</label>
              <input className={inp} value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="Optional barcode" />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Description</label>
              <textarea className={inp + ' resize-none'} rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
            </div>
          </div>

          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-400 font-medium">Variants</label>
              <button onClick={addVariant} className="text-xs text-blue-400 hover:text-blue-300">+ Add Variant</button>
            </div>
            <div className="space-y-2">
              {variants.map((v, i) => (
                <div key={i} className="bg-slate-800 rounded-xl p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={lbl}>Variant Name *</label>
                      <input className={inp} value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)} placeholder="e.g. White / M" />
                    </div>
                    <div>
                      <label className={lbl}>SKU</label>
                      <input className={inp} value={v.sku} onChange={e => updateVariant(i, 'sku', e.target.value)} placeholder="e.g. NM-001-WHT-M" />
                    </div>
                    <div>
                      <label className={lbl}>Sale Price (USD) *</label>
                      <input className={inp} type="number" step="0.01" min="0" value={v.sale_price} onChange={e => updateVariant(i, 'sale_price', e.target.value)} placeholder="0.00" />
                    </div>
                    <div>
                      <label className={lbl}>Stock Qty</label>
                      <input className={inp} type="number" min="0" value={v.stock_qty} onChange={e => updateVariant(i, 'stock_qty', e.target.value)} />
                    </div>
                    <div>
                      <label className={lbl}>Min Stock</label>
                      <input className={inp} type="number" min="0" value={v.min_stock_qty} onChange={e => updateVariant(i, 'min_stock_qty', e.target.value)} />
                    </div>
                    <div className="flex items-end">
                      {variants.length > 1 && (
                        <button onClick={() => removeVariant(i)} className="w-full py-2 rounded-lg bg-red-900/40 hover:bg-red-900/60 text-red-400 text-xs transition-colors">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors">
            {saving ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>
  )
}
