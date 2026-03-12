'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { productService } from '@/lib/api'
import type { Product, ProductVariant } from '@/types'
import { useCart } from '../../layout'

export default function ProductDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { add } = useCart()
  const [product,  setProduct]  = useState<Product | null>(null)
  const [selected, setSelected] = useState<ProductVariant | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [added,    setAdded]    = useState(false)
  const [qty,      setQty]      = useState(1)

  useEffect(() => {
    productService.get(Number(id)).then(r => {
      if (r.success) { setProduct(r.data); setSelected(r.data.variants[0]) }
      setLoading(false)
    })
  }, [id])

  const handleAdd = () => {
    if (!product || !selected) return
    for (let i = 0; i < qty; i++) {
      add({ id: product.id, variantId: selected.id, name: product.name, variant: selected.name, price: selected.sale_price, image: product.image_url })
    }
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (loading) return (
    <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-2 gap-16">
      <div className="aspect-square bg-stone-100 rounded-3xl animate-pulse" />
      <div className="space-y-4 pt-8">
        <div className="h-4 bg-stone-100 rounded w-24 animate-pulse" />
        <div className="h-10 bg-stone-100 rounded w-3/4 animate-pulse" />
        <div className="h-6 bg-stone-100 rounded w-24 animate-pulse" />
      </div>
    </div>
  )

  if (!product) return (
    <div className="text-center py-32 text-stone-400">
      <p className="text-xl font-semibold mb-4">Product not found</p>
      <Link href="/store/shop" className="text-sm underline">Back to shop</Link>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-6 py-12" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-stone-400 mb-10">
        <Link href="/store" className="hover:text-stone-700">Home</Link>
        <span>/</span>
        <Link href="/store/shop" className="hover:text-stone-700">Shop</Link>
        <span>/</span>
        <span className="text-stone-700">{product.name}</span>
      </nav>

      <div className="grid grid-cols-2 gap-16">
        {/* Image */}
        <div>
          <div className="aspect-square bg-stone-100 rounded-3xl overflow-hidden">
            {product.image_url
              ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-stone-300">
                    <div className="text-8xl mb-4">👗</div>
                    <div className="text-sm">No image available</div>
                  </div>
                </div>
            }
          </div>
          {/* Thumbnail row placeholder */}
          <div className="flex gap-3 mt-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`w-20 h-20 rounded-xl bg-stone-100 cursor-pointer border-2 transition-colors ${i === 0 ? 'border-black' : 'border-transparent hover:border-stone-300'}`} />
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="pt-4">
          {product.category && (
            <p className="text-xs font-bold tracking-[0.3em] uppercase text-stone-400 mb-3">{product.category.name}</p>
          )}
          <h1 className="text-4xl font-black text-stone-900 tracking-tight mb-4">{product.name}</h1>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-3xl font-black text-black">${selected?.sale_price.toFixed(2)}</span>
            {product.cost_price && (
              <span className="text-sm text-stone-400 line-through">${(product.cost_price * 1.5).toFixed(2)}</span>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-stone-500 text-sm leading-relaxed mb-6 max-w-md">{product.description}</p>
          )}

          {/* Variant selector */}
          {product.variants.length > 1 && (
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">
                Select Option: <span className="text-stone-700">{selected?.name}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map(v => (
                  <button key={v.id} onClick={() => setSelected(v)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all
                      ${selected?.id === v.id
                        ? 'border-black bg-black text-white'
                        : 'border-stone-200 text-stone-600 hover:border-stone-400'}
                      ${v.stock_qty === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                    disabled={v.stock_qty === 0}>
                    {v.name}
                    {v.stock_qty === 0 && <span className="ml-1 text-xs">(OOS)</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stock */}
          <div className="flex items-center gap-2 mb-6">
            <span className={`w-2 h-2 rounded-full ${(selected?.stock_qty ?? 0) > 0 ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <span className="text-sm text-stone-500">
              {(selected?.stock_qty ?? 0) > 0
                ? `In Stock (${selected?.stock_qty} available)`
                : 'Out of Stock'}
            </span>
          </div>

          {/* Qty + Add */}
          <div className="flex gap-3 mb-6">
            <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden">
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-12 h-14 flex items-center justify-center text-stone-500 hover:bg-stone-50 text-lg font-light">−</button>
              <span className="w-10 text-center font-semibold text-sm">{qty}</span>
              <button onClick={() => setQty(q => q + 1)}
                className="w-12 h-14 flex items-center justify-center text-stone-500 hover:bg-stone-50 text-lg font-light">+</button>
            </div>
            <button onClick={handleAdd}
              disabled={(selected?.stock_qty ?? 0) === 0}
              className={`flex-1 py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-all
                ${added
                  ? 'bg-emerald-500 text-white'
                  : 'bg-black text-white hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed'}`}>
              {added ? '✓ Added to Cart' : 'Add to Cart'}
            </button>
          </div>

          {/* Barcode */}
          {product.barcode && (
            <p className="text-xs text-stone-300 font-mono">SKU: {product.barcode}</p>
          )}

          {/* Features */}
          <div className="border-t border-stone-100 mt-8 pt-8 grid grid-cols-3 gap-4">
            {[
              { icon: '🚚', label: 'Free Shipping', sub: 'On orders over $50' },
              { icon: '↩️', label: 'Easy Returns', sub: '30-day return policy' },
              { icon: '🔒', label: 'Secure Payment', sub: '100% secure checkout' },
            ].map(f => (
              <div key={f.label} className="text-center">
                <div className="text-2xl mb-1">{f.icon}</div>
                <p className="text-xs font-bold text-stone-700">{f.label}</p>
                <p className="text-[10px] text-stone-400 mt-0.5">{f.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
