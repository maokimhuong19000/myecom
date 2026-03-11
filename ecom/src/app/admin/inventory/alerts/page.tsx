'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { inventoryService } from '@/lib/api'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    inventoryService.getAlerts().then(r => {
      if (r.success) setAlerts(r.data)
      setLoading(false)
    })
  }, [])

  const outOfStock  = alerts.filter(a => a.stock_qty === 0)
  const lowStock    = alerts.filter(a => a.stock_qty > 0)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight">Low Stock Alerts</h1>
          <p className="text-sm text-slate-500 mt-0.5">{alerts.length} variants need attention</p>
        </div>
        <Link href="/admin/inventory"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors">
          Adjust Stock
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-red-500/[0.07] border border-red-500/20 rounded-2xl p-5">
          <div className="text-3xl font-bold text-red-400">{outOfStock.length}</div>
          <div className="text-sm text-red-400/70 mt-1">Out of Stock</div>
        </div>
        <div className="bg-amber-500/[0.07] border border-amber-500/20 rounded-2xl p-5">
          <div className="text-3xl font-bold text-amber-400">{lowStock.length}</div>
          <div className="text-sm text-amber-400/70 mt-1">Running Low</div>
        </div>
        <div className="bg-[#10121a] border border-white/[0.06] rounded-2xl p-5">
          <div className="text-3xl font-bold text-slate-300">{alerts.length}</div>
          <div className="text-sm text-slate-600 mt-1">Total Alerts</div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-white/[0.03] rounded-2xl animate-pulse" />)}
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-[#10121a] border border-white/[0.06] rounded-2xl py-20 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-lg font-semibold text-white">All stocked up!</h3>
          <p className="text-slate-600 text-sm mt-1">No variants are running low</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Out of stock */}
          {outOfStock.length > 0 && (
            <>
              <h2 className="text-xs font-semibold text-red-400/70 uppercase tracking-wider px-1">Out of Stock</h2>
              {outOfStock.map(a => <AlertRow key={a.variant_id} alert={a} />)}
            </>
          )}
          {/* Low stock */}
          {lowStock.length > 0 && (
            <>
              <h2 className="text-xs font-semibold text-amber-400/70 uppercase tracking-wider px-1 mt-4">Running Low</h2>
              {lowStock.map(a => <AlertRow key={a.variant_id} alert={a} />)}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function AlertRow({ alert }: { alert: any }) {
  const pct = Math.min(100, (alert.stock_qty / Math.max(alert.min_stock_qty * 2, 1)) * 100)
  const isOut = alert.stock_qty === 0

  return (
    <div className={`bg-[#10121a] border rounded-2xl p-4 flex items-center gap-4
      ${isOut ? 'border-red-500/20' : 'border-amber-500/15'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0
        ${isOut ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
        {isOut ? '🚫' : '⚠️'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-white truncate">{alert.product?.name}</p>
          <span className="text-xs text-slate-600">·</span>
          <p className="text-xs text-slate-500">{alert.variant_name}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700
              ${isOut ? 'bg-red-500' : 'bg-amber-500'}`}
              style={{ width: `${pct}%` }} />
          </div>
          <span className={`text-xs font-mono ${isOut ? 'text-red-400' : 'text-amber-400'}`}>
            {alert.stock_qty} / {alert.min_stock_qty} min
          </span>
        </div>
      </div>
      <Link href="/admin/inventory"
        className="flex-shrink-0 text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1.5 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/10 transition-colors">
        Restock
      </Link>
    </div>
  )
}
