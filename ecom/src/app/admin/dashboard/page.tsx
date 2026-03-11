'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { analyticsService, inventoryService, orderService } from '@/lib/api'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

function StatCard({ label, value, sub, change, positive, icon, accent }: any) {
  return (
    <div className={`bg-[#10121a] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.12] transition-colors`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${accent}`}>
          {icon}
        </div>
        {change && (
          <span className={`text-[11px] font-semibold px-2 py-1 rounded-lg ${positive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {change}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white mt-2">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-slate-600 mt-1">{sub}</div>}
    </div>
  )
}

const PERIOD_TABS = ['Today', 'Week', 'Month', 'Year']

export default function DashboardPage() {
  const [period, setPeriod] = useState('Month')
  const [summary, setSummary]   = useState<any>(null)
  const [trends,  setTrends]    = useState<any[]>([])
  const [alerts,  setAlerts]    = useState<any[]>([])
  const [orders,  setOrders]    = useState<any[]>([])
  const [topProds, setTopProds] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    setLoading(true)
    const p = period.toLowerCase()
    Promise.all([
      analyticsService.summary(p),
      analyticsService.trends(p === 'today' ? 'day' : p === 'week' ? 'week' : p === 'month' ? 'month' : 'year'),
      inventoryService.getAlerts(),
      orderService.list(),
      analyticsService.topProducts(p, 5),
    ]).then(([s, t, a, o, tp]) => {
      if (s.success)  setSummary(s.data)
      if (t.success)  setTrends(t.data.series ?? [])
      if (a.success)  setAlerts(a.data.slice(0, 4))
      if (o.success)  setOrders(o.data.slice(0, 5))
      if (tp.success) setTopProds(tp.data.slice(0, 4))
      setLoading(false)
    })
  }, [period])

  const CASH_DATA = summary ? [
    { name: 'Revenue', value: summary.total_revenue_usd, color: '#6366f1' },
    { name: 'Cost',    value: summary.total_cost_usd,    color: '#f59e0b' },
    { name: 'Profit',  value: summary.net_profit_usd,    color: '#10b981' },
  ] : []

  const totalCashFlow = CASH_DATA.reduce((s, d) => s + d.value, 0)

  return (
    <div className="p-6 space-y-5 min-h-full">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex bg-white/[0.04] border border-white/[0.07] rounded-xl p-1 gap-0.5">
          {PERIOD_TABS.map(t => (
            <button key={t} onClick={() => setPeriod(t)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${period === t
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-white/[0.03] rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Total Revenue"  value={`$${(summary?.total_revenue_usd ?? 0).toFixed(2)}`}
            icon="💰" accent="bg-indigo-500/10 text-indigo-400" change="+12.5%" positive />
          <StatCard label="Net Profit"     value={`$${(summary?.net_profit_usd ?? 0).toFixed(2)}`}
            icon="📈" accent="bg-emerald-500/10 text-emerald-400" change="+8.2%" positive />
          <StatCard label="Items Sold"     value={(summary?.total_volume ?? 0).toLocaleString()}
            icon="📦" accent="bg-amber-500/10 text-amber-400" change="+5.1%" positive />
          <StatCard label="Profit Margin"  value={`${summary?.profit_margin_pct ?? 0}%`}
            icon="🎯" accent="bg-violet-500/10 text-violet-400"
            change={`${summary?.profit_margin_pct > 30 ? '+' : ''}${summary?.profit_margin_pct ?? 0}%`}
            positive={summary?.profit_margin_pct >= 30} />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">

        {/* Revenue / Cost trend */}
        <div className="col-span-2 bg-[#10121a] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-white">Revenue Report</h2>
              <p className="text-[11px] text-slate-600 mt-0.5">{period} overview</p>
            </div>
            <div className="flex gap-4 text-[11px] text-slate-500">
              {[
                { label: 'Revenue', color: '#6366f1' },
                { label: 'Cost',    color: '#f59e0b' },
                { label: 'Profit',  color: '#10b981' },
              ].map(l => (
                <span key={l.label} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
          {trends.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center gap-2 text-slate-700">
              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              <span className="text-sm">No data for this period</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={trends} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  {[
                    { id: 'rev', color: '#6366f1' },
                    { id: 'cost', color: '#f59e0b' },
                    { id: 'profit', color: '#10b981' },
                  ].map(g => (
                    <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={g.color} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={g.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1e2030', border: '1px solid #ffffff15', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#e2e8f0' }} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#rev)"    name="Revenue" />
                <Area type="monotone" dataKey="cost"    stroke="#f59e0b" strokeWidth={2} fill="url(#cost)"   name="Cost" />
                <Area type="monotone" dataKey="profit"  stroke="#10b981" strokeWidth={2} fill="url(#profit)" name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Cash flow donut */}
        <div className="bg-[#10121a] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Cash Flow</h2>
            <span className="text-[11px] text-slate-600">{period}</span>
          </div>
          {totalCashFlow === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-700 text-sm">No data</div>
          ) : (
            <>
              <div className="relative flex justify-center">
                <PieChart width={160} height={160}>
                  <Pie data={CASH_DATA} cx={75} cy={75} innerRadius={48} outerRadius={72}
                    startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
                    {CASH_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">
                      {totalCashFlow > 0 ? Math.round((summary?.net_profit_usd / summary?.total_revenue_usd) * 100) : 0}%
                    </div>
                    <div className="text-[10px] text-slate-600">margin</div>
                  </div>
                </div>
              </div>
              <div className="space-y-2 mt-4">
                {CASH_DATA.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-500">
                      <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      {d.name}
                    </span>
                    <span className="font-semibold text-slate-300">${d.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-4">

        {/* Recent orders */}
        <div className="col-span-2 bg-[#10121a] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent Orders</h2>
            <Link href="/admin/analytics" className="text-[11px] text-indigo-400 hover:text-indigo-300">View all →</Link>
          </div>
          {orders.length === 0 ? (
            <div className="py-12 text-center text-slate-700 text-sm">No orders yet</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['Order', 'Method', 'Amount', 'Status'].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <span className="text-xs font-mono text-slate-400">#{order.id}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full
                        ${order.payment_method === 'cash' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-violet-500/10 text-violet-400'}`}>
                        {order.payment_method}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold text-white">${order.total_usd?.toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <span className="text-[11px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">Completed</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Low stock + top products */}
        <div className="space-y-4">
          {/* Top products */}
          <div className="bg-[#10121a] border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white">Top Products</h2>
              <Link href="/admin/analytics" className="text-[11px] text-indigo-400 hover:text-indigo-300">All →</Link>
            </div>
            {topProds.length === 0 ? (
              <p className="text-xs text-slate-700 py-4 text-center">No sales data</p>
            ) : (
              <div className="space-y-2">
                {topProds.map((p, i) => (
                  <div key={p.variant_id} className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-slate-700 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-slate-300 truncate">{p.product_name}</p>
                      <div className="mt-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${Math.min(100, (p.total_qty / (topProds[0]?.total_qty || 1)) * 100)}%` }} />
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">{p.total_qty}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Low stock */}
          <div className="bg-[#10121a] border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white">Low Stock</h2>
              <Link href="/admin/inventory/alerts" className="text-[11px] text-indigo-400 hover:text-indigo-300">All →</Link>
            </div>
            {alerts.length === 0 ? (
              <div className="text-center py-3">
                <div className="text-2xl mb-1">✅</div>
                <p className="text-xs text-slate-600">All stocked up</p>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map(a => (
                  <div key={a.variant_id} className="flex items-center gap-2.5 p-2 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs flex-shrink-0
                      ${a.stock_qty === 0 ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                      {a.stock_qty === 0 ? '✕' : '!'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-slate-300 truncate">{a.product?.name}</p>
                    </div>
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-lg
                      ${a.stock_qty === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                      {a.stock_qty}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { href: '/admin/products',          icon: '📦', label: 'Add Product',   desc: 'Create new product' },
          { href: '/admin/inventory',          icon: '📋', label: 'Adjust Stock',  desc: 'Update inventory' },
          { href: '/pos/register',             icon: '🖥️', label: 'Open Register', desc: 'Start selling' },
          { href: '/admin/analytics',          icon: '📊', label: 'View Reports',  desc: 'Sales analytics' },
        ].map(a => (
          <Link key={a.href} href={a.href}
            className="bg-[#10121a] border border-white/[0.06] rounded-2xl p-4 hover:border-indigo-500/25 hover:bg-indigo-500/[0.04] transition-all group">
            <div className="text-2xl mb-2.5">{a.icon}</div>
            <div className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">{a.label}</div>
            <div className="text-[11px] text-slate-600 mt-0.5">{a.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
