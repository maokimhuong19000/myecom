'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/api'

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LEN = 5

function generateCode() {
  return Array.from({ length: CODE_LEN }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
}

function drawCaptcha(canvas: HTMLCanvasElement, code: string) {
  const ctx = canvas.getContext('2d')!
  const W = canvas.width, H = canvas.height

  ctx.fillStyle = '#10121a'
  ctx.fillRect(0, 0, W, H)

  // Noise lines
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `rgba(99,102,241,${0.15 + Math.random() * 0.2})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(Math.random() * W, Math.random() * H)
    ctx.bezierCurveTo(Math.random() * W, Math.random() * H, Math.random() * W, Math.random() * H, Math.random() * W, Math.random() * H)
    ctx.stroke()
  }

  // Noise dots
  for (let i = 0; i < 35; i++) {
    ctx.fillStyle = `rgba(139,92,246,${Math.random() * 0.25})`
    ctx.beginPath()
    ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 1.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // Characters
  const colors = ['#818cf8', '#34d399', '#f472b6', '#fb923c', '#a78bfa', '#facc15']
  code.split('').forEach((char, i) => {
    ctx.save()
    const x = 16 + i * (W - 16) / CODE_LEN
    const y = H / 2 + 7
    ctx.translate(x, y)
    ctx.rotate((Math.random() - 0.5) * 0.45)
    ctx.font = `bold ${20 + Math.random() * 5}px monospace`
    ctx.fillStyle = colors[i % colors.length]
    ctx.shadowColor = colors[i % colors.length]
    ctx.shadowBlur = 6
    ctx.fillText(char, 0, 0)
    ctx.restore()
  })
}

export default function LoginPage() {
  const router    = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [email,        setEmail]        = useState('admin@example.com')
  const [password,     setPassword]     = useState('')
  const [captchaCode,  setCaptchaCode]  = useState('')
  const [captchaInput, setCaptchaInput] = useState('')
  const [captchaError, setCaptchaError] = useState(false)
  const [error,        setError]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [showPass,     setShowPass]     = useState(false)

  const refreshCaptcha = useCallback(() => {
    const code = generateCode()
    setCaptchaCode(code)
    setCaptchaInput('')
    setCaptchaError(false)
    setTimeout(() => {
      if (canvasRef.current) drawCaptcha(canvasRef.current, code)
    }, 10)
  }, [])

  useEffect(() => { refreshCaptcha() }, [refreshCaptcha])

  const handleLogin = async () => {
    if (!email || !password) return setError('Please enter your credentials')

    if (captchaInput.toUpperCase() !== captchaCode) {
      setCaptchaError(true)
      refreshCaptcha()
      return
    }

    setLoading(true); setError('')
    const res = await authService.login(email, password)
    setLoading(false)
    if (res.success) {
      router.push('/admin/dashboard')
    } else {
      setError(res.message || 'Invalid credentials')
      refreshCaptcha()
    }
  }

  const inputCls = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all'

  return (
    <div className="min-h-screen bg-[#0c0e14] flex items-center justify-center p-4"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/8 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-[360px] relative">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-4 shadow-xl shadow-indigo-500/30">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Ecomerce</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-[#10121a] border border-white/[0.07] rounded-2xl p-6 shadow-2xl">

          {error && (
            <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-5">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className={inputCls} />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••"
                  className={inputCls + ' pr-10'} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPass
                    ? <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* CAPTCHA */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Security Code
              </label>
              <div className="flex gap-2 items-center mb-2">
                <canvas
                  ref={canvasRef}
                  width={170}
                  height={46}
                  className="rounded-xl border border-white/[0.08] select-none flex-1"
                />
                <button type="button" onClick={refreshCaptcha}
                  className="p-2.5 text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] rounded-xl border border-white/[0.08] transition-all"
                  title="New code">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                </button>
              </div>
              <input
                type="text"
                value={captchaInput}
                onChange={e => { setCaptchaInput(e.target.value.toUpperCase()); setCaptchaError(false) }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="Type the code above"
                maxLength={CODE_LEN}
                className={`${inputCls} tracking-[0.3em] font-mono text-center ${captchaError ? '!border-red-500/50 !bg-red-500/5 text-red-400' : ''}`}
              />
              {captchaError && (
                <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  Incorrect code — a new one has been generated
                </p>
              )}
            </div>
          </div>

          <button onClick={handleLogin} disabled={loading}
            className="w-full mt-5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                </svg>
                Signing in…
              </span>
            ) : 'Sign In'}
          </button>
        </div>

        <p className="text-center text-xs text-slate-700 mt-6">
          MyEcom Management System
        </p>
      </div>
    </div>
  )
}