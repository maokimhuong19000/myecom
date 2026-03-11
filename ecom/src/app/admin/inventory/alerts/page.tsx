'use client'
import { useEffect, useState } from 'react'
import { inventoryService } from '@/lib/api'
import type { LowStockAlert } from '@/types'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    inventoryService.getAlerts().then(r => {
      if (r.success) setAlerts(r.data)
      setLoading(false)
    })
  }, [])

  const critical = alerts.filter(a => a.stock_qty === 0)
  const low = alerts.filter(a => a.stock_qty > 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Low Stock Alerts</h1>
        {alerts.length > 0 && (
          <span className="bg-red-100 text-red-700 text-sm font-bold px-3 py-1 rounded-full">
            {alerts.length} items need attention
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading...</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-xl font-semibold text-gray-700">All stock levels are healthy</h2>
          <p className="text-gray-400 mt-1">No items are below their minimum threshold</p>
        </div>
      ) : (
        <div className="space-y-6">
          {critical.length > 0 && (
            <div>
              <h2 className="text-red-600 font-bold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-600 rounded-full inline-block"></span>
                Out of Stock ({critical.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {critical.map(a => <AlertCard key={a.variant_id} alert={a} />)}
              </div>
            </div>
          )}

          {low.length > 0 && (
            <div>
              <h2 className="text-orange-600 font-bold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full inline-block"></span>
                Running Low ({low.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {low.map(a => <AlertCard key={a.variant_id} alert={a} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AlertCard({ alert }: { alert: LowStockAlert }) {
  const isOut = alert.stock_qty === 0
  return (
    <div className={`bg-white border-2 rounded-xl p-4 ${isOut ? 'border-red-200' : 'border-orange-200'}`}>
      <div className="flex items-start gap-3">
        {alert.product.image_url ? (
          <img src={alert.product.image_url} className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
        ) : (
          <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">📦</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{alert.product.name}</p>
          <p className="text-sm text-gray-500">{alert.variant_name}</p>
          {alert.product.category && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{alert.product.category}</span>
          )}
        </div>
      </div>

      <div className={`mt-3 rounded-xl p-3 ${isOut ? 'bg-red-50' : 'bg-orange-50'}`}>
        <div className="flex justify-between items-center">
          <div>
            <div className={`text-2xl font-bold ${isOut ? 'text-red-600' : 'text-orange-600'}`}>
              {alert.stock_qty}
            </div>
            <div className="text-xs text-gray-500">in stock</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Min: {alert.min_stock_qty}</div>
            <div className={`text-sm font-semibold ${isOut ? 'text-red-600' : 'text-orange-600'}`}>
              Order {alert.units_needed}+ units
            </div>
          </div>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full ${isOut ? 'bg-red-500' : 'bg-orange-400'}`}
            style={{ width: `${Math.min(100, (alert.stock_qty / alert.min_stock_qty) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
