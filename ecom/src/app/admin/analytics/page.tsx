"use client";
import { useEffect, useState } from "react";
import { analyticsService } from "@/lib/api";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";

const PERIODS = ["Today", "Week", "Month", "Year"];
const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4"];

export default function AnalyticsPage() {
  const [period,   setPeriod]   = useState("Month");
  const [summary,  setSummary]  = useState<any>(null);
  const [trends,   setTrends]   = useState<any[]>([]);
  const [topProds, setTopProds] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    setLoading(true);
    const p  = period.toLowerCase();
    const tp = p === "today" ? "day" : p === "week" ? "week" : p === "month" ? "month" : "year";
    Promise.all([
      analyticsService.summary(p),
      analyticsService.trends(tp),
      analyticsService.topProducts(p, 8),
    ]).then(([s, t, tp2]) => {
      if (s.success)   setSummary(s.data);
      if (t.success)   setTrends(t.data?.series ?? t.data ?? []);
      if (tp2.success) setTopProds(tp2.data ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [period]);

  const kpis = summary ? [
    { label: "Revenue",    value: `$${(summary.total_revenue_usd ?? 0).toFixed(2)}`, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
    { label: "Total Cost", value: `$${(summary.total_cost_usd    ?? 0).toFixed(2)}`, color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20"  },
    { label: "Net Profit", value: `$${(summary.net_profit_usd    ?? 0).toFixed(2)}`, color: "text-emerald-400",bg: "bg-emerald-500/10",border: "border-emerald-500/20"},
    { label: "Margin",     value: `${summary.profit_margin_pct   ?? 0}%`,            color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
    { label: "Items Sold", value: (summary.total_volume           ?? 0).toLocaleString(), color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
  ] : [];

  // Parse name from API: "Product Name - Variant" or just "Product Name"
  const parseName = (item: any) => {
    const full = item.name ?? ""
    const dashIdx = full.lastIndexOf(" - ")
    if (dashIdx !== -1) return { product: full.slice(0, dashIdx), variant: full.slice(dashIdx + 3) }
    return { product: full, variant: "Default" }
  }

  const maxSold = topProds[0]?.total_sold || 1

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight">Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Sales performance overview</p>
        </div>
        <div className="flex bg-white/[0.04] border border-white/[0.07] rounded-xl p-1 gap-0.5">
          {PERIODS.map((t) => (
            <button key={t} onClick={() => setPeriod(t)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${period === t ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* KPI grid */}
      {loading ? (
        <div className="grid grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-white/[0.03] rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className={`${k.bg} border ${k.border} rounded-2xl p-4`}>
              <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
              <div className="text-[11px] text-slate-500 mt-1">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-[#10121a] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-white">Revenue vs Profit</h2>
              <p className="text-[11px] text-slate-600 mt-0.5">{period} trend</p>
            </div>
            <div className="flex gap-3 text-[11px]">
              {[{ label: "Revenue", color: "#6366f1" }, { label: "Cost", color: "#f59e0b" }, { label: "Profit", color: "#10b981" }].map((l) => (
                <span key={l.label} className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />{l.label}
                </span>
              ))}
            </div>
          </div>
          {trends.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-slate-700 text-sm">No sales data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={trends} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  {[{ id: "r", c: "#6366f1" }, { id: "c", c: "#f59e0b" }, { id: "p", c: "#10b981" }].map((g) => (
                    <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={g.c} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={g.c} stopOpacity={0}   />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#1e2030", border: "1px solid #ffffff15", borderRadius: 12, fontSize: 12 }} labelStyle={{ color: "#94a3b8" }} itemStyle={{ color: "#e2e8f0" }} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#r)" name="Revenue" />
                <Area type="monotone" dataKey="cost"    stroke="#f59e0b" strokeWidth={2} fill="url(#c)" name="Cost"    />
                <Area type="monotone" dataKey="profit"  stroke="#10b981" strokeWidth={2} fill="url(#p)" name="Profit"  />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top products donut */}
        <div className="bg-[#10121a] border border-white/[0.06] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Top Products</h2>
          {topProds.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-slate-700 text-sm">No data</div>
          ) : (
            <>
              <div className="flex justify-center">
                <PieChart width={160} height={160}>
                  <Pie data={topProds.slice(0, 6)} dataKey="total_sold" cx={75} cy={75} innerRadius={45} outerRadius={70} strokeWidth={0}>
                    {topProds.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </div>
              <div className="space-y-1.5 mt-2">
                {topProds.slice(0, 5).map((p, i) => (
                  <div key={p.variant_id} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i] }} />
                    <span className="text-[11px] text-slate-400 flex-1 truncate">{parseName(p).product}</span>
                    <span className="text-[11px] font-semibold text-slate-300">{p.total_sold}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bar chart */}
      <div className="bg-[#10121a] border border-white/[0.06] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-white">Sales Volume</h2>
            <p className="text-[11px] text-slate-600 mt-0.5">Units sold per period</p>
          </div>
        </div>
        {trends.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-slate-700 text-sm">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trends} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#1e2030", border: "1px solid #ffffff15", borderRadius: 12, fontSize: 12 }} labelStyle={{ color: "#94a3b8" }} itemStyle={{ color: "#e2e8f0" }} />
              <Bar dataKey="volume" fill="#6366f1" radius={[4, 4, 0, 0]} name="Units Sold" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Product Performance table */}
      {topProds.length > 0 && (
        <div className="bg-[#10121a] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white">Product Performance</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {["#", "Product", "Variant", "Units Sold", "Revenue"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {topProds.map((p, i) => {
                const { product, variant } = parseName(p)
                return (
                  <tr key={p.variant_id} className="hover:bg-white/[0.015]">
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-mono font-bold ${i === 0 ? "text-amber-400" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700" : "text-slate-700"}`}>
                        #{i + 1}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-300 max-w-[200px] truncate">{product}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">{variant}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(p.total_sold / maxSold) * 100}%` }} />
                        </div>
                        <span className="text-xs text-slate-400">{p.total_sold}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-slate-200">
                      ${p.total_revenue?.toFixed(2) ?? "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}