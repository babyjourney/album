import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { loginWithPin, isAuthenticated } from '../lib/pinAuth'

export default function Login() {
  const [pin, setPin] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rateLimitInfo, setRateLimitInfo] = useState(null)
  const [cooldownTimer, setCooldownTimer] = useState(null)
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated()) router.push('/dashboard')
  }, [])

  useEffect(() => {
    if (rateLimitInfo && rateLimitInfo.blockedUntil) {
      const tick = () => {
        const remaining = rateLimitInfo.blockedUntil - Date.now()
        if (remaining <= 0) {
          setRateLimitInfo(null)
          setCooldownTimer(null)
          setError('')
        } else {
          setCooldownTimer(formatTime(remaining))
        }
      }
      tick()
      const id = setInterval(tick, 1000)
      return () => clearInterval(id)
    }
  }, [rateLimitInfo])

  const formatTime = (ms) => {
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!phoneNumber) { setError('Introduceți numărul de telefon'); setLoading(false); return }
    if (!pin)         { setError('Introduceți PIN-ul');           setLoading(false); return }

    const result = await loginWithPin(pin, phoneNumber)

    if (result.success) {
      setRateLimitInfo(null); setCooldownTimer(null); setError('')
      router.push('/dashboard')
      return
    }

    if (result.suspended) {
      setRateLimitInfo(null); setCooldownTimer(null); setError(result.error); setLoading(false); return
    }
    if (result.rateLimited) {
      setRateLimitInfo({ level: result.level, blockedUntil: result.blockedUntil, timeRemaining: result.timeRemaining })
    } else {
      setRateLimitInfo(null); setCooldownTimer(null)
    }
    setError(result.error)
    setLoading(false)
  }

  const isBlocked = rateLimitInfo && cooldownTimer

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
    }}>
      {/* Slow orbiting accent orbs (purely decorative) */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0,
      }}>
        <div style={{
          position: 'absolute', top: '-12%', left: '-8%',
          width: 480, height: 480, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.55) 0%, transparent 60%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', right: '-6%',
          width: 520, height: 520, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(125,211,252,0.45) 0%, transparent 60%)',
          filter: 'blur(50px)',
        }} />
        <div style={{
          position: 'absolute', top: '38%', right: '18%',
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(251,113,133,0.40) 0%, transparent 60%)',
          filter: 'blur(36px)',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440 }}
           className="animate-glass-in">
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64,
            margin: '0 auto 18px',
            borderRadius: 20,
            background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #6d28d9 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow:
              '0 16px 32px -8px rgba(124,58,237,0.55),' +
              ' inset 0 1px 0 0 rgba(255,255,255,0.45)',
            border: '1px solid rgba(255,255,255,0.20)',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" ry="3"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21,15 16,10 5,21"/>
            </svg>
          </div>
          <h1 className="text-display" style={{ fontSize: 32, marginBottom: 8 }}>
            Bine ai revenit
          </h1>
          <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
            Albumul familiei te așteaptă
          </p>
        </div>

        {/* Glass form card */}
        <form onSubmit={handleSubmit} autoComplete="on" className="modal-glass" style={{
          padding: '32px 28px',
          gap: 0,
          animationDelay: '60ms',
        }}>
          {/* off-screen hidden username for password manager UX */}
          <input
            type="text" name="username" autoComplete="username"
            value="family-album-user" readOnly tabIndex="-1"
            style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
          />

          <label htmlFor="phone" className="text-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
            Număr de telefon
          </label>
          <input
            id="phone" name="phone" type="tel" autoComplete="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="061234567"
            required
            className="input-glass"
            style={{ marginBottom: 18 }}
          />

          <label htmlFor="pin" className="text-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
            PIN
          </label>
          <input
            id="pin" name="password" type="password" inputMode="numeric"
            pattern="[0-9]*" autoComplete="current-password"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="• • • •"
            maxLength="8"
            required
            className="input-glass nums"
            style={{
              textAlign: 'center', letterSpacing: 12, fontSize: 22,
              fontFamily: '"JetBrains Mono", SF Mono, monospace',
              marginBottom: 12,
            }}
          />

          <div style={{
            display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24,
          }}>
            <span className="glass-pill" style={{ padding: '6px 12px', fontSize: 12, color: 'var(--ink-2)' }}>
              4 cifre · Viewer
            </span>
            <span className="glass-pill" style={{ padding: '6px 12px', fontSize: 12, color: 'var(--ink-2)' }}>
              8 cifre · Editor
            </span>
          </div>

          {isBlocked && (
            <div role="alert" style={{
              marginBottom: 16, padding: '12px 14px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.32)',
              borderRadius: 12, color: 'var(--ink-1)',
              backdropFilter: 'blur(12px)',
            }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                {rateLimitInfo.level === 1 ? 'Cooldown 10 minute' : 'Cooldown 24 ore'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                Timp rămas: <strong className="nums">{cooldownTimer}</strong>
              </div>
            </div>
          )}

          {error && !isBlocked && (
            <div role="alert" style={{
              marginBottom: 16, padding: '12px 14px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.32)',
              borderRadius: 12, color: 'var(--ink-1)',
              backdropFilter: 'blur(12px)',
              fontSize: 14,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || isBlocked}
            className="btn-iris sheen"
            style={{
              width: '100%', padding: '14px',
              fontSize: 15, fontWeight: 600,
              borderRadius: 14,
            }}
          >
            {loading ? 'Se conectează…' : isBlocked ? `Blocat (${cooldownTimer})` : 'Intră în album'}
          </button>

          <div style={{
            marginTop: 22, paddingTop: 18,
            borderTop: '1px solid var(--glass-hairline)',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
              Amintirile tale sunt în siguranță.
            </p>
          </div>
        </form>

        {/* Tagline below */}
        <div style={{
          textAlign: 'center', marginTop: 22,
          fontSize: 12, color: 'var(--ink-3)',
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          Album · Familie · Momente
        </div>
      </div>
    </div>
  )
}
