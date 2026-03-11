'use client'
import { useState } from 'react'
import { productService } from '@/lib/api'
import type { Product, Category } from '@/types'

interface VariantRow { id?: number; name: string; sku: string; sale_price: string; stock_qty: string; min_stock_qty: string }

interface Props {
  product: Product | null
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}

export default function ProductForm({ product, categories, onClose, onSaved }: Props) {
  const [name,        setName]        = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [barcode,     setBarcode]     = useState(product?.barcode ?? '')
  const [imageUrl,    setImageUrl]    = useState(product?.image_url ?? '')
  const [costPrice,   setCostPrice]   = useState(String(product?.cost_price ?? ''))
  const [categoryId,  setCategoryId]  = useState(String(product?.category?.id ?? ''))
  const [variants, setVariants] = useState<VariantRow[]>(
    product?.variants.map(v => ({
      id: v.id, name: v.name, sku: v.sku ?? '',
      sale_price: String(v.sale_price), stock_qty: String(v.stock_qty), min_stock_qty: String(v.min_stock_qty),
    })) ?? [{ name: 'Default', sku: '', sale_price: '', stock_qty: '0', min_stock_qty: '5' }]
  )
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const field = "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"

  const updateVariant = (i: number, key: keyof VariantRow, val: string) =>
    setVariants(prev => prev.map((v, idx) => idx === i ? { ...v, [key]: val } : v))

  const handleSave = async () => {
    if (!name.trim()) return setError('Product name is required')
    if (variants.some(v => !v.name || !v.sale_price)) return setError('All variants need name and price')
    setSaving(true); setError('')
    const payload = {
      name, description,
      barcode:   barcode   || undefined,
      image_url: imageUrl  || undefined,
      cost_price: parseFloat(costPrice) || 0,
      category_id: categoryId ? parseInt(categoryId) : undefined,
      variants: variants.map(v => ({
        ...(v.id ? { id: v.id } : {}),
        name: v.name, sku: v.sku || undefined,
        sale_price:    parseFloat(v.sale_price),
        stock_qty:     parseInt(v.stock_qty)     || 0,
        min_stock_qty: parseInt(v.min_stock_qty) || 5,
      })),
    }
    const res = product
      ? await productService.update(product.id, payload)
      : await productService.create(payload)
    setSaving(false)
    if (res.success) onSaved()
    else setError(res.message || 'Failed to save')
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#10121a] border border-white/[0.08] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">

        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between sticky top-0 bg-[#10121a] z-10">
          <h2 className="font-bold text-white">{product ? 'Edit Product' : 'New Product'}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/[0.05] text-slate-500 hover:text-white flex items-center justify-center text-lg leading-none transition-colors">&times;</button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} className={field} placeholder="Product name" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Category</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                className={field + ' bg-[#0c0e14]'}>
                <option value="">No category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Cost Price (USD)</label>
              <input type="number" step="0.01" value={costPrice} onChange={e => setCostPrice(e.target.value)} placeholder="0.00" className={field} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Barcode</label>
              <input value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="Optional" className={field} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Image URL</label>
              <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://…" className={field} />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                className={field + ' resize-none'} />
            </div>
          </div>

          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Variants</label>
              <button onClick={() => setVariants(p => [...p, { name: '', sku: '', sale_price: '', stock_qty: '0', min_stock_qty: '5' }])}
                className="text-xs text-indigo-400 hover:text-indigo-300">+ Add</button>
            </div>
            <div className="space-y-2">
              {variants.map((v, i) => (
                <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 grid grid-cols-12 gap-2 items-end">
                  {[
                    { label: 'Name *', key: 'name',          col: 4, placeholder: 'Default', type: 'text' },
                    { label: 'SKU',    key: 'sku',            col: 2, placeholder: 'SKU',    type: 'text' },
                    { label: 'Price',  key: 'sale_price',     col: 2, placeholder: '0.00',   type: 'number' },
                    { label: 'Stock',  key: 'stock_qty',      col: 2, placeholder: '0',      type: 'number' },
                    { label: 'Min',    key: 'min_stock_qty',  col: 1, placeholder: '5',      type: 'number' },
                  ].map(f => (
                    <div key={f.key} className={`col-span-${f.col}`}>
                      <label className="text-[10px] text-slate-700 block mb-1">{f.label}</label>
                      <input type={f.type} value={v[f.key as keyof VariantRow]}
                        onChange={e => updateVariant(i, f.key as keyof VariantRow, e.target.value)}
                        placeholder={f.placeholder}
                        className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 placeholder-slate-700 focus:outline-none focus:border-indigo-500/40" />
                    </div>
                  ))}
                  <div className="col-span-1 flex items-end pb-0">
                    {variants.length > 1 && (
                      <button onClick={() => setVariants(p => p.filter((_, idx) => idx !== i))}
                        className="w-full py-1.5 text-xs text-red-500/60 hover:text-red-400 border border-white/[0.06] rounded-lg hover:bg-red-500/10 transition-colors">
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-white/[0.06] flex gap-3 sticky bottom-0 bg-[#10121a]">
          <button onClick={onClose}
            className="flex-1 border border-white/[0.08] rounded-xl py-2.5 text-sm text-slate-500 hover:bg-white/[0.04] transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 shadow-lg shadow-indigo-500/20">
            {saving ? 'Saving…' : product ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>
  )
}
