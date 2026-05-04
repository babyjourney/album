import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { signUp, getCurrentSession } from '../lib/auth'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  useEffect(() => { check() }, [])
  const check = async () => {
    const { session } = await getCurrentSession()
    if (session) router.push('/dashboard')
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')

    if (!email || !password || !fullName) { setError('Please fill in all fields'); setLoading(false); return }
    if (password.length < 6) { setError('Password must be at least 6 characters long'); setLoading(false); return }

    const { error } = await signUp(email, password, fullName)
    if (error) {
      setError(error.message)
    } else {
      setSuccess('Account created. Check your email to verify.')
      setEmail(''); setPassword(''); setFullName('')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative',
    }}>
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '-12%', left: '-8%',
          width: 460, height: 460, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.50) 0%, transparent 60%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', right: '-6%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(125,211,252,0.42) 0%, transparent 60%)',
          filter: 'blur(46px)',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64, margin: '0 auto 18px',
            borderRadius: 20,
            background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #6d28d9 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 16px 32px -8px rgba(124,58,237,0.55), inset 0 1px 0 0 rgba(255,255,255,0.45)',
            border: '1px solid rgba(255,255,255,0.20)',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/>
              <line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
          </div>
          <h1 className="text-display" style={{ fontSize: 32, marginBottom: 8 }}>Create your album</h1>
          <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>Start a private space for your family memories</p>
        </div>

        <form onSubmit={handleSignUp} className="modal-glass" style={{ padding: '32px 28px' }}>
          <label htmlFor="fullName" className="text-eyebrow" style={{ display: 'block', marginBottom: 8 }}>Full Name</label>
          <input id="fullName" type="text" value={fullName}
                 onChange={(e) => setFullName(e.target.value)}
                 placeholder="Maria Popescu" required
                 className="input-glass" style={{ marginBottom: 16 }} />

          <label htmlFor="email" className="text-eyebrow" style={{ display: 'block', marginBottom: 8 }}>Email</label>
          <input id="email" type="email" value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 placeholder="you@example.com" required
                 className="input-glass" style={{ marginBottom: 16 }} />

          <label htmlFor="password" className="text-eyebrow" style={{ display: 'block', marginBottom: 8 }}>Password</label>
          <input id="password" type="password" value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 placeholder="At least 6 characters" minLength="6" required
                 className="input-glass" style={{ marginBottom: 8 }} />
          <p style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 22 }}>Minimum 6 characters.</p>

          {error && (
            <div role="alert" style={{
              marginBottom: 16, padding: '12px 14px',
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.32)',
              borderRadius: 12, color: 'var(--ink-1)', fontSize: 14, backdropFilter: 'blur(12px)',
            }}>{error}</div>
          )}
          {success && (
            <div role="status" style={{
              marginBottom: 16, padding: '12px 14px',
              background: 'rgba(52,211,153,0.14)', border: '1px solid rgba(52,211,153,0.36)',
              borderRadius: 12, color: 'var(--ink-1)', fontSize: 14, backdropFilter: 'blur(12px)',
            }}>{success}</div>
          )}

          <button type="submit" disabled={loading}
                  className="btn-iris sheen"
                  style={{ width: '100%', padding: 14, fontSize: 15, borderRadius: 14 }}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--glass-hairline)', textAlign: 'center' }}>
            <p style={{ fontSize: 13.5, color: 'var(--ink-2)', margin: 0 }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: 'var(--accent-iris)', fontWeight: 600, textDecoration: 'none' }}>
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
