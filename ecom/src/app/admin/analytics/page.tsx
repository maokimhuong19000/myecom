'use client'
import { useEffect, useState } from 'react'
import { analyticsService } from '@/lib/api'
import type { AnalyticsSummary, TrendPoint } from '@/types'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'

const PERIODS = ['day', 'week', 'month', 'year', 'all'] as const
type Period = typeof PERIODS[number]

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [trends, setTrends] = useState<TrendPoint[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [period, setPeriod] = useState<Period>('month')
  const [trendPeriod, setTrendPeriod] = useState<'day' | 'week' | 'month'>('week')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      analyticsService.summary(period),
      analyticsService.trends(trendPeriod),
      analyticsService.topProducts(period),
    ]).then(([s, t, tp]) => {
      if (s.success) setSummary(s.data)
      if (t.success) setTrends(t.data.series)
      if (tp.success) setTopProducts(tp.data)
      setLoading(false)
    })
  }, [period, trendPeriod])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sales Analytics</h1>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors
                ${period === p ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard label="Items Sold" value={summary.total_volume.toLocaleString()} icon="📦" color="indigo" />
          <KpiCard label="Revenue" value={`$${summary.total_revenue_usd.toFixed(2)}`} icon="💰" color="blue" />
          <KpiCard label="Cost" value={`$${summary.total_cost_usd.toFixed(2)}`} icon="🏷️" color="gray" />
          <KpiCard label="Net Profit" value={`$${summary.net_profit_usd.toFixed(2)}`} icon="📈"
            color={summary.net_profit_usd >= 0 ? 'green' : 'red'} />
          <KpiCard label="Margin" value={`${summary.profit_margin_pct}%`} icon="🎯"
            color={summary.profit_margin_pct >= 20 ? 'green' : 'orange'} />
        </div>
      )}

      {/* Trend Charts */}
      <div className="bg-white border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-800">Revenue & Profit Trend</h2>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(['day', 'week', 'month'] as const).map(p => (
              <button key={p} onClick={() => setTrendPeriod(p)}
                className={`px-3 py-1 rounded-lg text-sm font-medium capitalize transition-colors
                  ${trendPeriod === p ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {trends.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400">No data for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => `$${Number(v).toFixed(2)}`} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} dot={false} name="Revenue" />
              <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} dot={false} name="Profit" />
              <Line type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 4" name="Cost" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Volume Chart */}
      {trends.length > 0 && (
        <div className="bg-white border rounded-2xl p-5">
          <h2 className="font-bold text-gray-800 mb-5">Sales Volume</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="volume" stroke="#8b5cf6" strokeWidth={2.5} dot={false} name="Items Sold" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Products */}
      {topProducts.length > 0 && (
        <div className="bg-white border rounded-2xl p-5">
          <h2 className="font-bold text-gray-800 mb-4">Top Products</h2>
          <div className="space-y-2">
            {topProducts.map((p, i) => (
              <div key={p.variant_id} className="flex items-center gap-3 py-2 border-b last:border-0">
                <span className="w-6 text-center text-sm font-bold text-gray-400">#{i + 1}</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{p.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{p.total_sold} sold</p>
                  <p className="text-sm text-indigo-600">${p.total_revenue.toFixed(2)}</p>
                </div>
                <div className="w-24">
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-indigo-400 h-2 rounded-full"
                      style={{ width: `${(p.total_sold / topProducts[0].total_sold) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 border-indigo-100',
    blue: 'bg-blue-50 border-blue-100',
    green: 'bg-green-50 border-green-100',
    red: 'bg-red-50 border-red-100',
    orange: 'bg-orange-50 border-orange-100',
    gray: 'bg-gray-50 border-gray-100',
  }
  return (
    <div className={`border rounded-2xl p-4 ${colors[color] || colors.gray}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}
