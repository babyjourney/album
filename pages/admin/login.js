import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { loginAdmin, isAdminAuthenticated } from '../../lib/adminAuth'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (isAdminAuthenticated()) router.push('/admin/dashboard')
  }, [router])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!username || !password) {
      setError('Completați toate câmpurile')
      setLoading(false)
      return
    }

    const result = await loginAdmin(username, password)

    if (result.success) {
      router.push('/admin/dashboard')
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  return (
    <div data-theme="dark" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      position: 'relative',
    }}>
      {/* Decorative orbs over the dark aurora */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '-10%', right: '-8%',
          width: 520, height: 520, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56,189,248,0.45) 0%, transparent 60%)',
          filter: 'blur(50px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-12%', left: '-10%',
          width: 480, height: 480, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.42) 0%, transparent 60%)',
          filter: 'blur(48px)',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64,
            margin: '0 auto 18px',
            borderRadius: 20,
            background: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 50%, #312e81 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 16px 32px -8px rgba(99,102,241,0.55), inset 0 1px 0 0 rgba(255,255,255,0.30)',
            border: '1px solid rgba(255,255,255,0.18)',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="3" ry="3"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 className="text-display" style={{ fontSize: 32, marginBottom: 8 }}>
            Admin Panel
          </h1>
          <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
            Conectare administrator
          </p>
        </div>

        <form onSubmit={handleLogin} className="modal-glass" style={{ padding: '32px 28px' }}>
          <label htmlFor="username" className="text-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
            Username
          </label>
          <input
            id="username" type="text" autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            required
            className="input-glass"
            style={{ marginBottom: 18 }}
          />

          <label htmlFor="password" className="text-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
            Parolă
          </label>
          <input
            id="password" type="password" autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="input-glass"
            style={{ marginBottom: 22 }}
          />

          {error && (
            <div role="alert" style={{
              marginBottom: 18, padding: '12px 14px',
              background: 'rgba(239, 68, 68, 0.16)',
              border: '1px solid rgba(239, 68, 68, 0.36)',
              borderRadius: 12, color: 'var(--ink-1)',
              backdropFilter: 'blur(12px)', fontSize: 14,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-iris sheen"
            style={{ width: '100%', padding: 14, fontSize: 15, borderRadius: 14 }}
          >
            {loading ? 'Se conectează…' : 'Conectare'}
          </button>

          <div style={{
            marginTop: 22, paddingTop: 18,
            borderTop: '1px solid var(--glass-hairline)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#34d399',
              boxShadow: '0 0 12px rgba(52,211,153,0.7)',
              animation: 'pulse 2.4s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 12.5, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
              Sistem securizat · Doar administratori autorizați
            </span>
          </div>
        </form>
      </div>
    </div>
  )
}
