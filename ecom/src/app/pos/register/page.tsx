'use client'
import { useEffect, useRef, useState } from 'react'
import { productService, orderService, tokenStore } from '@/lib/api'
import type { Product, CartItem } from '@/types'

const EXCHANGE_RATE = 4100

export default function RegisterPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [showScanner, setShowScanner] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'khqr'>('cash')
  const [cashTendered, setCashTendered] = useState('')
  const [orderResult, setOrderResult] = useState<any>(null)
  const [placing, setPlacing] = useState(false)
  const [scannerReady, setScannerReady] = useState(false)
  const scannerRef = useRef<any>(null)

  useEffect(() => {
    productService.list().then(r => { if (r.success) setProducts(r.data) })
  }, [])

  const filteredProducts = search
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : products

  const addToCart = (product: Product, variantId?: number) => {
    const variant = variantId
      ? product.variants.find(v => v.id === variantId)
      : product.variants[0]
    if (!variant) return
    setCart(prev => {
      const existing = prev.find(i => i.variant.id === variant.id)
      if (existing) return prev.map(i => i.variant.id === variant.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { product, variant, qty: 1 }]
    })
  }

  const updateQty = (variantId: number, qty: number) => {
    if (qty <= 0) setCart(prev => prev.filter(i => i.variant.id !== variantId))
    else setCart(prev => prev.map(i => i.variant.id === variantId ? { ...i, qty } : i))
  }

  const cartTotal = cart.reduce((sum, i) => sum + i.variant.sale_price * i.qty, 0)
  const cartTotalKHR = Math.round(cartTotal * EXCHANGE_RATE)
  const change = cashTendered ? parseFloat(cashTendered) - cartTotal : 0

  // Barcode scanner
  useEffect(() => {
    if (!showScanner) return

    let html5QrCode: any
    let isRunning = false

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        html5QrCode = new Html5Qrcode('qr-reader')
        scannerRef.current = html5QrCode
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          async (decodedText: string) => {
            if (!isRunning) return
            isRunning = false
            try { await html5QrCode.stop() } catch {}
            setShowScanner(false)
            const res = await productService.getByBarcode(decodedText)
            if (res.success) addToCart(res.data)
            else alert(`No product found for barcode: ${decodedText}`)
          },
          () => {}
        )
        isRunning = true
        setScannerReady(true)
      } catch (e) {
        console.error('Scanner error', e)
      }
    }

    startScanner()

    return () => {
      if (html5QrCode) {
        html5QrCode.isScanning
          ? html5QrCode.stop().catch(() => {}).finally(() => { scannerRef.current = null })
          : (scannerRef.current = null)
      }
      setScannerReady(false)
    }
  }, [showScanner])

  const closeScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) await scannerRef.current.stop()
      } catch {}
      scannerRef.current = null
    }
    setShowScanner(false)
    setScannerReady(false)
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return
    setPlacing(true)
    const res = await orderService.checkout({
      items: cart.map(i => ({ variant_id: i.variant.id, qty: i.qty })),
      payment_method: paymentMethod,
      cash_tendered_usd: paymentMethod === 'cash' && cashTendered ? parseFloat(cashTendered) : undefined,
      exchange_rate: EXCHANGE_RATE,
    })
    setPlacing(false)
    if (res.success) {
      setOrderResult(res.data)
      setCart([])
      setCashTendered('')
    } else {
      alert(res.message)
    }
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Left — Product Browser */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b p-4 flex gap-3">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            onClick={() => setShowScanner(true)}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 font-medium"
          >
            📷 Scan
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 content-start">
          {products.length === 0 && (
            <div className="col-span-4 text-center py-20 text-gray-400">
              No products yet. Add some from the admin panel.
            </div>
          )}
          {filteredProducts.map(product => (
            <div key={product.id}>
              {product.variants.length === 1 ? (
                <button
                  onClick={() => addToCart(product)}
                  className="w-full bg-white border rounded-xl p-3 text-left hover:border-indigo-400 hover:shadow-md transition-all"
                >
                  {product.image_url
                    ? <img src={product.image_url} alt={product.name} className="w-full h-28 object-cover rounded-lg mb-2" />
                    : <div className="w-full h-28 bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-3xl">📦</div>
                  }
                  <p className="font-medium text-sm text-gray-800 truncate">{product.name}</p>
                  <p className="text-indigo-600 font-bold">${product.variants[0].sale_price.toFixed(2)}</p>
                  <p className={`text-xs mt-0.5 ${product.variants[0].is_low_stock ? 'text-red-500' : 'text-gray-400'}`}>
                    Stock: {product.variants[0].stock_qty}
                  </p>
                </button>
              ) : (
                <div className="bg-white border rounded-xl p-3">
                  {product.image_url
                    ? <img src={product.image_url} alt={product.name} className="w-full h-20 object-cover rounded-lg mb-2" />
                    : <div className="w-full h-20 bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-2xl">📦</div>
                  }
                  <p className="font-medium text-sm text-gray-800 truncate mb-2">{product.name}</p>
                  <div className="space-y-1">
                    {product.variants.map(v => (
                      <button key={v.id} onClick={() => addToCart(product, v.id)}
                        className="w-full flex justify-between items-center text-xs border rounded-lg px-2 py-1.5 hover:bg-indigo-50 hover:border-indigo-300">
                        <span>{v.name}</span>
                        <span className="font-bold text-indigo-600">${v.sale_price.toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right — Cart */}
      <div className="w-80 bg-white border-l flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-bold text-gray-900 text-lg">Cart {cart.length > 0 && `(${cart.length})`}</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Cart is empty</p>
          ) : cart.map(item => (
            <div key={item.variant.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.product.name}</p>
                <p className="text-xs text-gray-500">{item.variant.name} · ${item.variant.sale_price.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(item.variant.id, item.qty - 1)}
                  className="w-7 h-7 rounded-lg border text-gray-600 hover:bg-red-50 text-sm font-bold">−</button>
                <span className="w-6 text-center text-sm font-bold">{item.qty}</span>
                <button onClick={() => updateQty(item.variant.id, item.qty + 1)}
                  className="w-7 h-7 rounded-lg border text-gray-600 hover:bg-green-50 text-sm font-bold">+</button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t space-y-3">
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <div className="text-right">
              <div className="text-indigo-700">${cartTotal.toFixed(2)}</div>
              <div className="text-sm text-gray-400 font-normal">≈ {cartTotalKHR.toLocaleString()} ៛</div>
            </div>
          </div>
          <button onClick={() => setShowCheckout(true)} disabled={cart.length === 0}
            className="w-full bg-indigo-600 text-white rounded-xl py-3 font-bold text-lg hover:bg-indigo-700 disabled:opacity-40">
            Checkout
          </button>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="w-full text-sm text-red-400 hover:text-red-600">
              Clear Cart
            </button>
          )}
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Scan Barcode</h3>
              <button onClick={closeScanner} className="text-2xl text-gray-400">&times;</button>
            </div>
            <div id="qr-reader" className="rounded-xl overflow-hidden" />
            <p className="text-center text-sm text-gray-400 mt-3">Point camera at barcode</p>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="font-bold text-xl">Checkout</h3>
              <button onClick={() => setShowCheckout(false)} className="text-2xl text-gray-400">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-indigo-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-indigo-700">${cartTotal.toFixed(2)}</div>
                <div className="text-gray-500">{cartTotalKHR.toLocaleString()} ៛</div>
              </div>
              <div className="flex rounded-xl overflow-hidden border">
                <button onClick={() => setPaymentMethod('cash')}
                  className={`flex-1 py-3 font-medium transition-colors ${paymentMethod === 'cash' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                  💵 Cash
                </button>
                <button onClick={() => setPaymentMethod('khqr')}
                  className={`flex-1 py-3 font-medium transition-colors ${paymentMethod === 'khqr' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                  📱 KHQR
                </button>
              </div>
              {paymentMethod === 'cash' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cash Tendered (USD)</label>
                  <input type="number" step="0.50" value={cashTendered}
                    onChange={e => setCashTendered(e.target.value)} placeholder="0.00"
                    className="w-full border rounded-xl px-4 py-3 text-xl text-right font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  {cashTendered && change >= 0 && (
                    <div className="mt-2 flex justify-between items-center bg-green-50 rounded-xl px-4 py-3">
                      <span className="text-green-700 font-medium">Change</span>
                      <div className="text-right">
                        <div className="text-xl font-bold text-green-700">${change.toFixed(2)}</div>
                        <div className="text-sm text-green-600">{Math.round(change * EXCHANGE_RATE).toLocaleString()} ៛</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {paymentMethod === 'khqr' && (
                <div className="text-center py-4">
                  <div className="bg-gray-100 rounded-xl p-8 inline-block">
                    <div className="text-6xl">📱</div>
                    <p className="mt-2 text-sm text-gray-500">Scan KHQR / Bakong code</p>
                    <p className="font-bold text-indigo-600 mt-1">${cartTotal.toFixed(2)}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t">
              <button onClick={handleCheckout}
                disabled={placing || (paymentMethod === 'cash' && !!cashTendered && change < 0)}
                className="w-full bg-green-600 text-white rounded-xl py-4 font-bold text-lg hover:bg-green-700 disabled:opacity-40">
                {placing ? 'Processing...' : '✓ Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Success Modal */}
      {orderResult && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Sale Complete!</h3>
            <p className="text-gray-500 mb-1">Order #{orderResult.order_id}</p>
            <p className="text-3xl font-bold text-indigo-700">${orderResult.total_usd?.toFixed(2)}</p>
            {orderResult.change_usd > 0 && (
              <p className="text-green-600 mt-2 font-medium">Change: ${orderResult.change_usd.toFixed(2)}</p>
            )}
            <button onClick={() => { setOrderResult(null); setShowCheckout(false) }}
              className="mt-6 w-full bg-indigo-600 text-white rounded-xl py-3 font-bold hover:bg-indigo-700">
              New Sale
            </button>
          </div>
        </div>
      )}
    </div>
  )
}