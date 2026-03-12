'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { productService } from '@/lib/api'
import type { Product } from '@/types'
import { useCart } from './layout'

// ── Hero Slides ───────────────────────────────────────────────────────────────
const SLIDES = [
  {
    tag: 'NEW COLLECTION',
    title: 'Style for\nthe Modern\nWardrobe',
    sub: 'Discover pieces that define your signature look',
    bg: 'from-stone-800 to-stone-950',
    accent: '#d4af7a',
  },
  {
    tag: 'SUMMER 2026',
    title: 'Fresh Cuts\n& Bold\nSilhouettes',
    sub: 'Contemporary fashion for every occasion',
    bg: 'from-slate-700 to-slate-900',
    accent: '#7eb8c4',
  },
  {
    tag: 'ESSENTIALS',
    title: 'Timeless\nPieces\nForever',
    sub: 'Quality craftsmanship built to last',
    bg: 'from-zinc-800 to-zinc-950',
    accent: '#c4a882',
  },
]

function Hero() {
  const [current, setCurrent] = useState(0)
  const [transitioning, setTransitioning] = useState(false)

  const go = (idx: number) => {
    setTransitioning(true)
    setTimeout(() => { setCurrent(idx); setTransitioning(false) }, 300)
  }

  useEffect(() => {
    const t = setInterval(() => go((current + 1) % SLIDES.length), 5000)
    return () => clearInterval(t)
  }, [current])

  const slide = SLIDES[current]

  return (
    <section className={`relative h-[92vh] bg-gradient-to-br ${slide.bg} overflow-hidden transition-all duration-700`}>
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 right-20 w-96 h-96 rounded-full border border-white/20" />
        <div className="absolute top-32 right-32 w-64 h-64 rounded-full border border-white/10" />
        <div className="absolute bottom-20 left-10 w-48 h-48 rounded-full border border-white/10" />
      </div>

      {/* Vertical text */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => go(i)}
            className={`w-1 rounded-full transition-all duration-300 ${i === current ? 'h-8 bg-white' : 'h-2 bg-white/30'}`} />
        ))}
      </div>

      <div className={`max-w-7xl mx-auto px-6 h-full flex items-center transition-opacity duration-300 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
        <div className="max-w-2xl">
          <p className="text-xs font-bold tracking-[0.4em] mb-6" style={{ color: slide.accent }}>{slide.tag}</p>
          <h1 className="text-6xl lg:text-8xl font-black text-white leading-none tracking-tight mb-6 whitespace-pre-line">
            {slide.title}
          </h1>
          <p className="text-stone-300 text-lg mb-10 max-w-md leading-relaxed">{slide.sub}</p>
          <div className="flex gap-4">
            <Link href="/store/shop"
              className="px-8 py-4 bg-white text-black font-bold text-sm tracking-widest uppercase hover:bg-stone-100 transition-colors rounded-full">
              Shop Now
            </Link>
            <Link href="/store/shop"
              className="px-8 py-4 border border-white/30 text-white font-bold text-sm tracking-widest uppercase hover:bg-white/10 transition-colors rounded-full">
              Explore
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40">
        <span className="text-[10px] tracking-widest uppercase">Scroll</span>
        <div className="w-px h-8 bg-white/20 animate-pulse" />
      </div>
    </section>
  )
}

// ── Category Tabs ─────────────────────────────────────────────────────────────
const TABS = ['All', 'Women', 'Men', 'Shoes', 'Bags', 'Accessories']

// ── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({ product }: { product: Product }) {
  const { add } = useCart()
  const [hovered, setHovered] = useState(false)
  const variant = product.variants[0]

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!variant) return
    add({
      id: product.id, variantId: variant.id,
      name: product.name, variant: variant.name,
      price: variant.sale_price, image: product.image_url,
    })
  }

  return (
    <Link href={`/store/product/${product.id}`}
      className="group cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      {/* Image */}
      <div className="relative aspect-[3/4] bg-stone-100 rounded-2xl overflow-hidden mb-3">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-stone-300">
              <div className="text-5xl mb-2">👗</div>
              <div className="text-xs">No image</div>
            </div>
          </div>
        )}
        {/* Add to cart overlay */}
        <div className={`absolute inset-x-0 bottom-0 p-3 transition-all duration-300 ${hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <button onClick={handleAdd}
            className="w-full bg-black text-white text-xs font-bold py-3 rounded-xl tracking-widest uppercase hover:bg-stone-800 transition-colors">
            Add to Cart
          </button>
        </div>
        {/* Category badge */}
        {product.category && (
          <div className="absolute top-3 left-3">
            <span className="text-[10px] font-bold bg-white/90 backdrop-blur-sm text-stone-700 px-2 py-1 rounded-full uppercase tracking-wider">
              {product.category.name}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-1">
        <p className="text-xs text-stone-400 uppercase tracking-wider mb-0.5">{product.category?.name ?? 'Fashion'}</p>
        <p className="text-sm font-semibold text-stone-900 truncate group-hover:text-black transition-colors">{product.name}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm font-bold text-black">${variant?.sale_price.toFixed(2) ?? '—'}</p>
          {product.variants.length > 1 && (
            <p className="text-xs text-stone-400">{product.variants.length} variants</p>
          )}
        </div>
      </div>
    </Link>
  )
}

// ── Promo Banners ─────────────────────────────────────────────────────────────
function PromoBanners() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="grid grid-cols-3 gap-4 h-[480px]">
        {/* Large left */}
        <div className="col-span-1 row-span-2 bg-gradient-to-br from-slate-700 to-slate-900 rounded-3xl p-8 flex flex-col justify-end relative overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_70%,#7eb8c4,transparent)]" />
          <p className="text-[10px] font-bold tracking-[0.3em] text-slate-400 mb-2 uppercase">Ethereal Elegance</p>
          <h3 className="text-2xl font-black text-white leading-tight mb-4">Where Dreams<br/>Meet Couture</h3>
          <Link href="/store/shop" className="inline-block bg-white text-black text-xs font-bold px-5 py-2.5 rounded-full tracking-wider uppercase hover:bg-stone-100 transition-colors w-fit">
            Shop Now
          </Link>
        </div>

        {/* Top right */}
        <div className="col-span-2 bg-gradient-to-r from-stone-100 to-stone-200 rounded-3xl p-8 flex flex-col justify-end relative overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_70%_30%,#d4af7a,transparent)]" />
          <p className="text-[10px] font-bold tracking-[0.3em] text-stone-500 mb-2 uppercase">Radiant Reverie</p>
          <h3 className="text-2xl font-black text-stone-900 leading-tight mb-4">Enchanting Styles<br/>for Every Woman</h3>
          <Link href="/store/shop" className="inline-block bg-black text-white text-xs font-bold px-5 py-2.5 rounded-full tracking-wider uppercase hover:bg-stone-800 transition-colors w-fit">
            Shop Now
          </Link>
        </div>

        {/* Bottom right split */}
        <div className="bg-gradient-to-br from-zinc-800 to-zinc-950 rounded-3xl p-6 flex flex-col justify-end relative overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_80%,#c4a882,transparent)]" />
          <p className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 mb-2 uppercase">Urban Strides</p>
          <h3 className="text-lg font-black text-white leading-tight mb-3">Chic Footwear<br/>for City Living</h3>
          <Link href="/store/shop" className="inline-block bg-white text-black text-xs font-bold px-4 py-2 rounded-full tracking-wider uppercase hover:bg-stone-100 transition-colors w-fit">
            Shop Now
          </Link>
        </div>

        <div className="bg-black rounded-3xl p-6 flex flex-col justify-center items-center text-center relative overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,#6366f1,transparent)]" />
          <p className="text-[10px] font-bold tracking-[0.3em] text-stone-500 mb-3 uppercase">Trendsetting Bags</p>
          <p className="text-6xl font-black text-white leading-none">50%</p>
          <p className="text-stone-400 text-sm mt-1 mb-4">Off selected bags</p>
          <Link href="/store/shop" className="inline-block bg-white text-black text-xs font-bold px-4 py-2 rounded-full tracking-wider uppercase hover:bg-stone-100 transition-colors">
            Shop Now
          </Link>
        </div>
      </div>
    </section>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState('All')

  useEffect(() => {
    productService.list().then(r => {
      if (r.success) setProducts(r.data)
      setLoading(false)
    })
  }, [])

  const displayed = products.slice(0, 8)

  return (
    <>
      <Hero />

      {/* New Arrivals */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-stone-900 tracking-tight mb-6">New Arrivals</h2>
          {/* Category tabs */}
          <div className="flex items-center justify-center gap-1">
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-bold tracking-widest uppercase transition-all rounded-full
                  ${activeTab === tab
                    ? 'text-black border-b-2 border-black bg-stone-100'
                    : 'text-stone-400 hover:text-stone-700'}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-[3/4] bg-stone-100 rounded-2xl animate-pulse" />
                <div className="h-3 bg-stone-100 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-stone-100 rounded animate-pulse w-1/2" />
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-20 text-stone-400">
            <div className="text-5xl mb-4">👗</div>
            <p>No products yet. Add some from the admin panel.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {displayed.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}

        {products.length > 8 && (
          <div className="text-center mt-12">
            <Link href="/store/shop"
              className="inline-block border border-stone-300 text-stone-700 text-sm font-bold px-10 py-4 rounded-full tracking-widest uppercase hover:bg-black hover:text-white hover:border-black transition-all">
              View All Products
            </Link>
          </div>
        )}
      </section>

      <PromoBanners />
    </>
  )
}
