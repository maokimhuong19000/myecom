'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { tokenStore } from '@/lib/api'

const NAV_MAIN = [
  { label: 'Dashboard',   href: '/admin/dashboard',          icon: <DashIcon /> },
  { label: 'Products',    href: '/admin/products',            icon: <BoxIcon /> },
  { label: 'Inventory',   href: '/admin/inventory',           icon: <LayersIcon /> },
  { label: 'Low Stock',   href: '/admin/inventory/alerts',    icon: <AlertIcon /> },
  { label: 'Analytics',   href: '/admin/analytics',           icon: <ChartIcon /> },
]

const NAV_POS = [
  { label: 'POS Register', href: '/pos/register', icon: <RegisterIcon /> },
]

function DashIcon()    { return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> }
function BoxIcon()     { return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg> }
function LayersIcon()  { return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg> }
function AlertIcon()   { return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> }
function ChartIcon()   { return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> }
function RegisterIcon(){ return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> }

interface NavItemProps {
  item: { label: string; href: string; icon: React.ReactNode }
  active: boolean
  collapsed: boolean
}

function NavItem({ item, active, collapsed }: NavItemProps) {
  return (
    <Link href={item.href}
      title={collapsed ? item.label : undefined}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative
        ${active
          ? 'bg-indigo-500/15 text-indigo-400'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}
      `}>
      <span className={`flex-shrink-0 transition-colors ${active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
        {item.icon}
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
      {active && !collapsed && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
      )}
    </Link>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (!tokenStore.get()) router.push('/login')
  }, [])

  const logout = () => { tokenStore.clear(); router.push('/login') }

  return (
    <div className="flex h-screen bg-[#0c0e14] overflow-hidden" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside className={`
        ${collapsed ? 'w-[68px]' : 'w-[220px]'}
        flex-shrink-0 flex flex-col bg-[#10121a] border-r border-white/[0.06]
        transition-all duration-300 ease-in-out
      `}>

        {/* Logo */}
        <div className="flex items-center gap-3 h-16 px-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/25">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          {!collapsed && (
            <span className="font-bold text-white tracking-tight text-[15px]">MyEcom</span>
          )}
          <button onClick={() => setCollapsed(c => !c)}
            className="ml-auto text-slate-600 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-white/5">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              {collapsed
                ? <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>
                : <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>
              }
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {!collapsed && (
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.1em] px-3 mb-2">Main</p>
          )}
          {NAV_MAIN.map(item => (
            <NavItem key={item.href} item={item} active={pathname === item.href} collapsed={collapsed} />
          ))}

          <div className={`${collapsed ? 'my-3 mx-2 border-t border-white/[0.06]' : 'my-3 mx-1 border-t border-white/[0.06]'}`} />

          {!collapsed && (
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.1em] px-3 mb-2">POS</p>
          )}
          {NAV_POS.map(item => (
            <NavItem key={item.href} item={item} active={pathname === item.href} collapsed={collapsed} />
          ))}
        </nav>

        {/* User */}
        <div className="p-2 border-t border-white/[0.06]">
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group text-left">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              A
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-300 truncate">Admin</p>
                <p className="text-[10px] text-slate-600 group-hover:text-slate-500">Sign out</p>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header className="h-16 flex-shrink-0 bg-[#10121a] border-b border-white/[0.06] flex items-center px-6 gap-4">
          <div className="flex-1">
            <div className="relative max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input placeholder="Search…"
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500/40 transition-colors" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.08] transition-colors">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
              A
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto bg-[#0c0e14]">
          {children}
        </main>
      </div>
    </div>
  )
}
