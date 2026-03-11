'use client'
import { useEffect, useState } from 'react'
import { productService, inventoryService } from '@/lib/api'
import type { Product, ProductVariant, InventoryLog } from '@/types'

export default function InventoryPage() {
  const [products,  setProducts]  = useState<Product[]>([])
  const [selected,  setSelected]  = useState<{ product: Product; variant: ProductVariant } | null>(null)
  const [logs,      setLogs]      = useState<InventoryLog[]>([])
  const [type,      setType]      = useState<'in' | 'out'>('in')
  const [qty,       setQty]       = useState('1')
  const [note,      setNote]      = useState('')
  const [showAdj,   setShowAdj]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [search,    setSearch]    = useState('')

  useEffect(() => {
    productService.list().then(r => { if (r.success) setProducts(r.data) })
  }, [])

  const filteredProducts = search
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : products

  const selectVariant = async (product: Product, variant: ProductVariant) => {
    setSelected({ product, variant })
    setShowAdj(false); setError('')
    const r = await inventoryService.getLogs(variant.id)
    if (r.success) setLogs(r.data)
  }

  const handleAdjust = async () => {
    if (!selected) return
    if (!note.trim()) return setError('Note is required for audit trail')
    const qtyNum = parseInt(qty)
    if (!qtyNum || qtyNum <= 0) return setError('Enter a valid quantity')
    setSaving(true); setError('')
    const change = type === 'in' ? qtyNum : -qtyNum
    const res = await inventoryService.adjust(selected.variant.id, change, note)
    setSaving(false)
    if (res.success) {
      setShowAdj(false); setNote(''); setQty('1')
      const [pRes, lRes] = await Promise.all([
        productService.list(),
        inventoryService.getLogs(selected.variant.id),
      ])
      if (pRes.success) {
        setProducts(pRes.data)
        const up = pRes.data.find(p => p.id === selected.product.id)
        const uv = up?.variants.find(v => v.id === selected.variant.id)
        if (up && uv) setSelected({ product: up, variant: uv })
      }
      if (lRes.success) setLogs(lRes.data)
    } else setError(res.message || 'Failed to adjust')
  }

  const field = "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-white tracking-tight">Inventory</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage stock levels and view audit trail</p>
      </div>

      <div className="grid grid-cols-12 gap-5 h-[calc(100vh-180px)]">

        {/* Left: Product/Variant list */}
        <div className="col-span-4 bg-[#10121a] border border-white/[0.06] rounded-2xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-white/[0.06]">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-8 pr-3 py-2 text-xs text-slate-400 placeholder-slate-700 focus:outline-none focus:border-indigo-500/30" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredProducts.map(product => (
              <div key={product.id}>
                <div className="px-4 py-2 bg-white/[0.015] sticky top-0">
                  <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider truncate">{product.name}</p>
                </div>
                {product.variants.map(variant => (
                  <button key={variant.id} onClick={() => selectVariant(product, variant)}
                    className={`w-full text-left px-4 py-2.5 border-b border-white/[0.03] flex items-center justify-between transition-all hover:bg-white/[0.03]
                      ${selected?.variant.id === variant.id ? 'bg-indigo-500/[0.08] border-l-2 border-l-indigo-500/60' : ''}`}>
                    <div>
                      <p className="text-xs font-medium text-slate-300">{variant.name}</p>
                      {variant.sku && <p className="text-[10px] text-slate-700 font-mono">{variant.sku}</p>}
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg
                      ${variant.stock_qty === 0 ? 'bg-red-500/15 text-red-400'
                        : variant.is_low_stock ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {variant.stock_qty}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Detail */}
        <div className="col-span-8 flex flex-col gap-4 overflow-y-auto">
          {!selected ? (
            <div className="flex-1 bg-[#10121a] border border-white/[0.06] rounded-2xl flex items-center justify-center">
              <div className="text-center text-slate-700">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                <p className="text-sm">Select a variant to manage stock</p>
              </div>
            </div>
          ) : (
            <>
              {/* Stock summary */}
              <div className="bg-[#10121a] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">{selected.product.name}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{selected.variant.name}
                      {selected.variant.sku && <span className="text-slate-700 ml-2 font-mono text-xs">· {selected.variant.sku}</span>}
                    </p>
                    <div className="flex gap-4 mt-3 text-xs text-slate-600">
                      <span>Sale: <span className="text-slate-300 font-semibold">${selected.variant.sale_price.toFixed(2)}</span></span>
                      <span>Min stock: <span className="text-slate-300 font-semibold">{selected.variant.min_stock_qty}</span></span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-5xl font-bold tabular-nums
                      ${selected.variant.stock_qty === 0 ? 'text-red-400'
                        : selected.variant.is_low_stock ? 'text-amber-400'
                        : 'text-emerald-400'}`}>
                      {selected.variant.stock_qty}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">units in stock</p>
                  </div>
                </div>

                {/* Stock bar */}
                <div className="mt-4">
                  <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500
                      ${selected.variant.stock_qty === 0 ? 'bg-red-500'
                        : selected.variant.is_low_stock ? 'bg-amber-500'
                        : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, (selected.variant.stock_qty / Math.max(selected.variant.stock_qty, selected.variant.min_stock_qty * 3)) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button onClick={() => { setType('in'); setShowAdj(true) }}
                    className="flex-1 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors shadow-lg shadow-emerald-500/15 flex items-center justify-center gap-2">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Stock In
                  </button>
                  <button onClick={() => { setType('out'); setShowAdj(true) }}
                    className="flex-1 bg-amber-600/90 hover:bg-amber-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors shadow-lg shadow-amber-500/15 flex items-center justify-center gap-2">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Stock Out
                  </button>
                </div>
              </div>

              {/* Adjust form */}
              {showAdj && (
                <div className={`bg-[#10121a] border rounded-2xl p-5
                  ${type === 'in' ? 'border-emerald-500/25' : 'border-amber-500/25'}`}>
                  <h3 className={`font-semibold mb-4 flex items-center gap-2 text-sm
                    ${type === 'in' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {type === 'in'
                      ? <><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Stock In</>
                      : <><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg> Stock Out</>
                    }
                  </h3>
                  {error && <p className="text-red-400 text-xs mb-3 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">{error}</p>}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Quantity</label>
                      <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} className={field} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Audit Note *</label>
                      <input value={note} onChange={e => setNote(e.target.value)}
                        placeholder={type === 'in' ? 'e.g. Received from supplier' : 'e.g. Damaged goods'}
                        className={field} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowAdj(false); setError('') }}
                      className="flex-1 border border-white/[0.08] rounded-xl py-2.5 text-sm text-slate-500 hover:bg-white/[0.04]">Cancel</button>
                    <button onClick={handleAdjust} disabled={saving}
                      className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50
                        ${type === 'in' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'}`}>
                      {saving ? 'Saving…' : 'Confirm Adjustment'}
                    </button>
                  </div>
                </div>
              )}

              {/* Audit log */}
              <div className="bg-[#10121a] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-white">Audit Trail</h3>
                </div>
                {logs.length === 0 ? (
                  <div className="py-12 text-center text-slate-700 text-sm">No history yet</div>
                ) : (
                  <div className="divide-y divide-white/[0.03]">
                    {logs.map(log => (
                      <div key={log.id} className="px-5 py-3.5 flex items-center gap-4">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0
                          ${log.change_qty > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {log.change_qty > 0 ? '+' : ''}{log.change_qty}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-300">{log.note}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5">{new Date(log.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
