'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useCart } from '../layout'
import { orderService } from '@/lib/api'

const EXCHANGE_RATE = 4100

export default function CartPage() {
  const { items, remove, update, total, clear } = useCart()
  const [step,          setStep]          = useState<'cart' | 'checkout' | 'success'>('cart')
  const [payMethod,     setPayMethod]     = useState<'cash' | 'khqr'>('cash')
  const [cashTendered,  setCashTendered]  = useState('')
  const [placing,       setPlacing]       = useState(false)
  const [orderResult,   setOrderResult]   = useState<any>(null)
  const [error,         setError]         = useState('')

  const change = cashTendered ? parseFloat(cashTendered) - total : 0
  const totalKHR = Math.round(total * EXCHANGE_RATE)

  const handleCheckout = async () => {
    if (items.length === 0) return
    setPlacing(true); setError('')
    const res = await orderService.checkout({
      items: items.map(i => ({ variant_id: i.variantId, qty: i.qty })),
      payment_method: payMethod,
      cash_tendered_usd: payMethod === 'cash' && cashTendered ? parseFloat(cashTendered) : undefined,
      exchange_rate: EXCHANGE_RATE,
    })
    setPlacing(false)
    if (res.success) {
      setOrderResult(res.data)
      clear()
      setStep('success')
    } else {
      setError(res.message || 'Checkout failed. Please try again.')
    }
  }

  if (step === 'success') return (
    <div className="max-w-lg mx-auto px-6 py-24 text-center" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg width="36" height="36" fill="none" stroke="#10b981" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h1 className="text-3xl font-black text-stone-900 mb-2">Order Placed!</h1>
      <p className="text-stone-500 mb-2">Order #{orderResult?.order_id}</p>
      <p className="text-2xl font-black text-black mb-1">${orderResult?.total_usd?.toFixed(2)}</p>
      {orderResult?.change_usd > 0 && (
        <p className="text-emerald-600 text-sm font-medium mb-6">Change: ${orderResult.change_usd.toFixed(2)} / {Math.round(orderResult.change_usd * EXCHANGE_RATE).toLocaleString()} ៛</p>
      )}
      <p className="text-stone-400 text-sm mb-8">Thank you for shopping with NM Fashion!</p>
      <Link href="/store/shop"
        className="inline-block bg-black text-white font-bold px-10 py-4 rounded-full text-sm tracking-widest uppercase hover:bg-stone-800 transition-colors">
        Continue Shopping
      </Link>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-6 py-12" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <h1 className="text-4xl font-black text-stone-900 tracking-tight mb-10">
        {step === 'cart' ? 'Your Cart' : 'Checkout'}
      </h1>

      {items.length === 0 && step === 'cart' ? (
        <div className="text-center py-24 text-stone-400">
          <div className="text-6xl mb-5">🛍️</div>
          <h2 className="text-xl font-bold text-stone-700 mb-2">Your cart is empty</h2>
          <p className="text-sm mb-8">Add some items to get started</p>
          <Link href="/store/shop"
            className="inline-block bg-black text-white font-bold px-10 py-4 rounded-full text-sm tracking-widest uppercase hover:bg-stone-800 transition-colors">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-12">
          {/* Items */}
          <div className="col-span-2">
            {step === 'cart' ? (
              <div className="space-y-5">
                {items.map(item => (
                  <div key={item.variantId} className="flex gap-5 p-5 bg-stone-50 rounded-2xl">
                    <div className="w-24 h-28 bg-white rounded-xl overflow-hidden flex-shrink-0 border border-stone-100">
                      {item.image
                        ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-stone-300 text-3xl">👗</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-stone-900">{item.name}</p>
                          <p className="text-sm text-stone-400 mt-0.5">{item.variant}</p>
                        </div>
                        <button onClick={() => remove(item.variantId)} className="text-stone-300 hover:text-red-500 transition-colors ml-4">
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center border border-stone-200 rounded-xl bg-white">
                          <button onClick={() => update(item.variantId, item.qty - 1)}
                            className="w-9 h-9 flex items-center justify-center text-stone-400 hover:text-black">−</button>
                          <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                          <button onClick={() => update(item.variantId, item.qty + 1)}
                            className="w-9 h-9 flex items-center justify-center text-stone-400 hover:text-black">+</button>
                        </div>
                        <p className="font-black text-stone-900">${(item.price * item.qty).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Checkout form */
              <div className="space-y-5">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
                )}

                {/* Payment method */}
                <div className="bg-stone-50 rounded-2xl p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-4">Payment Method</p>
                  <div className="flex gap-3">
                    {[
                      { key: 'cash', label: '💵 Cash', sub: 'Pay with cash' },
                      { key: 'khqr', label: '📱 KHQR', sub: 'Scan to pay' },
                    ].map(m => (
                      <button key={m.key} onClick={() => setPayMethod(m.key as 'cash' | 'khqr')}
                        className={`flex-1 p-4 rounded-xl border-2 text-left transition-all
                          ${payMethod === m.key ? 'border-black bg-white' : 'border-transparent bg-white/60 hover:bg-white'}`}>
                        <div className="font-bold text-sm">{m.label}</div>
                        <div className="text-xs text-stone-400 mt-0.5">{m.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {payMethod === 'cash' && (
                  <div className="bg-stone-50 rounded-2xl p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">Cash Tendered (USD)</p>
                    <input type="number" step="0.50" value={cashTendered}
                      onChange={e => setCashTendered(e.target.value)} placeholder="0.00"
                      className="w-full border border-stone-200 rounded-xl px-4 py-3 text-2xl font-bold text-right focus:outline-none focus:border-stone-400 bg-white" />
                    {cashTendered && change >= 0 && (
                      <div className="mt-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex justify-between">
                        <span className="text-emerald-700 font-semibold text-sm">Change</span>
                        <div className="text-right">
                          <div className="font-black text-emerald-700">${change.toFixed(2)}</div>
                          <div className="text-xs text-emerald-500">{Math.round(change * EXCHANGE_RATE).toLocaleString()} ៛</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {payMethod === 'khqr' && (
                  <div className="bg-stone-50 rounded-2xl p-8 text-center">
                    <div className="w-40 h-40 bg-white border-2 border-stone-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <div className="text-center">
                        <div className="text-5xl">📱</div>
                        <p className="text-xs text-stone-400 mt-2">KHQR / Bakong</p>
                      </div>
                    </div>
                    <p className="font-black text-2xl">${total.toFixed(2)}</p>
                    <p className="text-stone-400 text-sm">{totalKHR.toLocaleString()} ៛</p>
                  </div>
                )}

                {/* Order summary */}
                <div className="bg-stone-50 rounded-2xl p-5 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">Order Summary</p>
                  {items.map(i => (
                    <div key={i.variantId} className="flex justify-between text-sm">
                      <span className="text-stone-600">{i.name} × {i.qty}</span>
                      <span className="font-semibold">${(i.price * i.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Summary sidebar */}
          <div className="col-span-1">
            <div className="bg-stone-50 rounded-2xl p-6 sticky top-24">
              <h3 className="font-bold text-stone-900 mb-5">Order Summary</h3>
              <div className="space-y-3 text-sm mb-5">
                <div className="flex justify-between text-stone-500">
                  <span>Subtotal ({items.reduce((s, i) => s + i.qty, 0)} items)</span>
                  <span className="font-semibold text-stone-800">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>Shipping</span>
                  <span className="text-emerald-600 font-semibold">Free</span>
                </div>
                <div className="border-t border-stone-200 pt-3 flex justify-between font-black text-stone-900 text-base">
                  <span>Total</span>
                  <div className="text-right">
                    <div>${total.toFixed(2)}</div>
                    <div className="text-xs text-stone-400 font-normal">{totalKHR.toLocaleString()} ៛</div>
                  </div>
                </div>
              </div>

              {step === 'cart' ? (
                <button onClick={() => setStep('checkout')}
                  className="w-full bg-black text-white font-bold py-4 rounded-xl text-sm tracking-widest uppercase hover:bg-stone-800 transition-colors">
                  Proceed to Checkout
                </button>
              ) : (
                <>
                  <button onClick={handleCheckout}
                    disabled={placing || (payMethod === 'cash' && !!cashTendered && change < 0)}
                    className="w-full bg-black text-white font-bold py-4 rounded-xl text-sm tracking-widest uppercase hover:bg-stone-800 disabled:opacity-40 transition-colors">
                    {placing ? 'Processing…' : 'Place Order'}
                  </button>
                  <button onClick={() => setStep('cart')}
                    className="w-full mt-2 text-sm text-stone-400 hover:text-stone-600 py-2">
                    ← Back to Cart
                  </button>
                </>
              )}

              <Link href="/store/shop" className="block text-center text-xs text-stone-400 hover:text-stone-600 mt-3 underline underline-offset-4">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
