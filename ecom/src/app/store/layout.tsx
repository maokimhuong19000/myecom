'use client'
import { useState, useEffect, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// ── Cart Context ──────────────────────────────────────────────────────────────
interface CartItem { id: number; variantId: number; name: string; variant: string; price: number; image?: string; qty: number }
interface CartCtx { items: CartItem[]; add: (item: Omit<CartItem, 'qty'>) => void; remove: (variantId: number) => void; update: (variantId: number, qty: number) => void; clear: () => void; total: number; count: number }

const CartContext = createContext<CartCtx>({} as CartCtx)
export const useCart = () => useContext(CartContext)

function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const add = (item: Omit<CartItem, 'qty'>) => setItems(prev => {
    const ex = prev.find(i => i.variantId === item.variantId)
    if (ex) return prev.map(i => i.variantId === item.variantId ? { ...i, qty: i.qty + 1 } : i)
    return [...prev, { ...item, qty: 1 }]
  })
  const remove = (variantId: number) => setItems(prev => prev.filter(i => i.variantId !== variantId))
  const update = (variantId: number, qty: number) => {
    if (qty <= 0) return remove(variantId)
    setItems(prev => prev.map(i => i.variantId === variantId ? { ...i, qty } : i))
  }
  const clear = () => setItems([])
  const total = items.reduce((s, i) => s + i.price * i.qty, 0)
  const count = items.reduce((s, i) => s + i.qty, 0)
  return <CartContext.Provider value={{ items, add, remove, update, clear, total, count }}>{children}</CartContext.Provider>
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  const { count } = useCart()
  const [cartOpen, setCartOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const navLinks = [
    { label: 'Home', href: '/store' },
    { label: 'Shop', href: '/store/shop' },
  ]

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-sm' : 'bg-white/95 backdrop-blur-md'}`}
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Nav links */}
          <div className="flex items-center gap-8">
            {navLinks.map(l => (
              <Link key={l.href} href={l.href}
                className={`text-sm font-medium tracking-wide transition-colors
                  ${pathname === l.href ? 'text-black border-b border-black' : 'text-stone-500 hover:text-black'}`}>
                {l.label}
              </Link>
            ))}
          </div>

          {/* Logo */}
          <Link href="/store" className="absolute left-1/2 -translate-x-1/2">
            <span className="text-xl font-black tracking-[0.2em] text-black uppercase">NM Fashion</span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Link href="/store/shop">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="text-stone-600 hover:text-black transition-colors cursor-pointer">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </Link>
            <button onClick={() => setCartOpen(true)} className="relative">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="text-stone-600 hover:text-black transition-colors">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-black text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Cart Drawer */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}

// ── Cart Drawer ───────────────────────────────────────────────────────────────
function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, remove, update, total, clear } = useCart()

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col
        ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
          <h2 className="font-bold text-lg tracking-tight">Your Cart ({items.length})</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-black">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-stone-400">
              <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24" className="mb-4 opacity-30">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              <p className="text-sm">Your cart is empty</p>
              <button onClick={onClose} className="mt-4 text-xs underline underline-offset-4">Continue Shopping</button>
            </div>
          ) : (
            <div className="space-y-5">
              {items.map(item => (
                <div key={item.variantId} className="flex gap-4">
                  <div className="w-20 h-24 bg-stone-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.image
                      ? <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
                      : <div className="w-full h-full flex items-center justify-center text-stone-300 text-2xl">👕</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-black truncate">{item.name}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{item.variant}</p>
                    <p className="text-sm font-bold mt-1">${item.price.toFixed(2)}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border border-stone-200 rounded-lg">
                        <button onClick={() => update(item.variantId, item.qty - 1)}
                          className="w-7 h-7 flex items-center justify-center text-stone-500 hover:text-black text-sm">−</button>
                        <span className="w-6 text-center text-xs font-semibold">{item.qty}</span>
                        <button onClick={() => update(item.variantId, item.qty + 1)}
                          className="w-7 h-7 flex items-center justify-center text-stone-500 hover:text-black text-sm">+</button>
                      </div>
                      <button onClick={() => remove(item.variantId)} className="text-xs text-stone-400 hover:text-red-500 transition-colors">Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="px-6 py-5 border-t border-stone-100 space-y-3">
            <div className="flex justify-between text-sm font-medium text-stone-500">
              <span>Subtotal</span>
              <span className="text-black font-bold text-base">${total.toFixed(2)}</span>
            </div>
            <Link href="/store/cart" onClick={onClose}
              className="block w-full bg-black text-white text-center py-3.5 rounded-xl text-sm font-bold tracking-wide hover:bg-stone-800 transition-colors">
              Checkout
            </Link>
            <button onClick={() => { clear(); onClose() }}
              className="block w-full text-center text-xs text-stone-400 hover:text-stone-600 transition-colors">
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <Navbar />
        <main className="pt-16">{children}</main>
        <footer className="bg-stone-900 text-white mt-20">
          <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-black tracking-[0.15em] uppercase mb-3">NM Fashion</h3>
              <p className="text-stone-400 text-sm leading-relaxed">Modern style for the contemporary wardrobe. Quality pieces, timeless design.</p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">Shop</h4>
              <div className="space-y-2">
                {['New Arrivals', 'Women', 'Men', 'Accessories'].map(l => (
                  <Link key={l} href="/store/shop" className="block text-sm text-stone-400 hover:text-white transition-colors">{l}</Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">Help</h4>
              <div className="space-y-2">
                {['Contact Us', 'Shipping', 'Returns', 'Size Guide'].map(l => (
                  <span key={l} className="block text-sm text-stone-400">{l}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-stone-800 px-6 py-4 max-w-7xl mx-auto flex justify-between items-center">
            <p className="text-xs text-stone-600">© 2026 NM Fashion. All rights reserved.</p>
            <p className="text-xs text-stone-600">Powered by MyEcom</p>
          </div>
        </footer>
      </div>
    </CartProvider>
  )
}
