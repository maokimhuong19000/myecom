'use client'
import { useEffect, useState } from 'react'
import { productService, inventoryService } from '@/lib/api'
import type { Product, ProductVariant, InventoryLog } from '@/types'

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedVariant, setSelectedVariant] = useState<{ product: Product; variant: ProductVariant } | null>(null)
  const [logs, setLogs] = useState<InventoryLog[]>([])
  const [showAdjust, setShowAdjust] = useState(false)
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in')
  const [qty, setQty] = useState('1')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    productService.list().then(r => { if (r.success) setProducts(r.data) })
  }, [])

  const selectVariant = async (product: Product, variant: ProductVariant) => {
    setSelectedVariant({ product, variant })
    const res = await inventoryService.getLogs(variant.id)
    if (res.success) setLogs(res.data)
  }

  const handleAdjust = async () => {
    if (!selectedVariant || !note.trim()) return setError('Note is required')
    const qtyNum = parseInt(qty)
    if (!qtyNum || qtyNum <= 0) return setError('Enter a valid quantity')

    setSaving(true)
    setError('')
    const change = adjustType === 'in' ? qtyNum : -qtyNum
    const res = await inventoryService.adjust(selectedVariant.variant.id, change, note)
    setSaving(false)

    if (res.success) {
      setShowAdjust(false)
      setNote('')
      setQty('1')
      // Refresh
      const [pRes, lRes] = await Promise.all([
        productService.list(),
        inventoryService.getLogs(selectedVariant.variant.id),
      ])
      if (pRes.success) {
        setProducts(pRes.data)
        const updatedProduct = pRes.data.find(p => p.id === selectedVariant.product.id)
        const updatedVariant = updatedProduct?.variants.find(v => v.id === selectedVariant.variant.id)
        if (updatedProduct && updatedVariant) setSelectedVariant({ product: updatedProduct, variant: updatedVariant })
      }
      if (lRes.success) setLogs(lRes.data)
    } else {
      setError(res.message || 'Failed to adjust stock')
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Inventory Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product/Variant List */}
        <div className="lg:col-span-1 bg-white border rounded-xl overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-700">Products & Variants</h2>
          </div>
          <div className="overflow-y-auto max-h-[70vh]">
            {products.map(product => (
              <div key={product.id}>
                <div className="px-4 py-2 bg-gray-50 border-b">
                  <p className="text-sm font-medium text-gray-700">{product.name}</p>
                </div>
                {product.variants.map(variant => (
                  <button
                    key={variant.id}
                    onClick={() => selectVariant(product, variant)}
                    className={`w-full text-left px-4 py-3 border-b hover:bg-indigo-50 transition-colors flex items-center justify-between
                      ${selectedVariant?.variant.id === variant.id ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''}`}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{variant.name}</p>
                      {variant.sku && <p className="text-xs text-gray-400">SKU: {variant.sku}</p>}
                    </div>
                    <span className={`text-sm font-bold px-2 py-1 rounded-lg
                      ${variant.is_low_stock ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                      {variant.stock_qty}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-2">
          {selectedVariant ? (
            <div className="space-y-4">
              {/* Stock Card */}
              <div className="bg-white border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedVariant.product.name}</h2>
                    <p className="text-gray-500">{selectedVariant.variant.name}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${selectedVariant.variant.is_low_stock ? 'text-red-500' : 'text-green-600'}`}>
                      {selectedVariant.variant.stock_qty}
                    </div>
                    <p className="text-xs text-gray-400">in stock (min: {selectedVariant.variant.min_stock_qty})</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setAdjustType('in'); setShowAdjust(true) }}
                    className="flex-1 bg-green-600 text-white rounded-lg py-2.5 font-medium hover:bg-green-700"
                  >
                    ↑ Stock In
                  </button>
                  <button
                    onClick={() => { setAdjustType('out'); setShowAdjust(true) }}
                    className="flex-1 bg-orange-500 text-white rounded-lg py-2.5 font-medium hover:bg-orange-600"
                  >
                    ↓ Stock Out
                  </button>
                </div>
              </div>

              {/* Adjust Modal inline */}
              {showAdjust && (
                <div className="bg-white border rounded-xl p-5">
                  <h3 className="font-semibold mb-3 text-gray-800">
                    {adjustType === 'in' ? '↑ Stock In' : '↓ Stock Out'}
                  </h3>
                  {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Quantity *</label>
                      <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)}
                        className="w-full mt-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Audit Note *</label>
                      <input value={note} onChange={e => setNote(e.target.value)}
                        placeholder={adjustType === 'in' ? 'e.g. Received from supplier' : 'e.g. Removed due to damage'}
                        className="w-full mt-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowAdjust(false)}
                        className="flex-1 border rounded-lg py-2 text-gray-600 hover:bg-gray-50">Cancel</button>
                      <button onClick={handleAdjust} disabled={saving}
                        className="flex-1 bg-indigo-600 text-white rounded-lg py-2 font-medium hover:bg-indigo-700 disabled:opacity-50">
                        {saving ? 'Saving...' : 'Confirm'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Audit Log */}
              <div className="bg-white border rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b bg-gray-50">
                  <h3 className="font-semibold text-gray-700">Audit Trail</h3>
                </div>
                {logs.length === 0 ? (
                  <p className="text-center py-8 text-gray-400">No history yet</p>
                ) : (
                  <div className="divide-y">
                    {logs.map(log => (
                      <div key={log.id} className="px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`text-lg font-bold ${log.type === 'in' ? 'text-green-600' : 'text-red-500'}`}>
                            {log.type === 'in' ? '+' : ''}{log.change_qty}
                          </span>
                          <div>
                            <p className="text-sm text-gray-800">{log.note}</p>
                            <p className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border rounded-xl flex items-center justify-center h-48 text-gray-400">
              Select a variant to manage stock
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
