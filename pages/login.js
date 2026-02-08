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
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/dashboard')
    }
    const check = () => setIsMobile(window.innerWidth <= 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (rateLimitInfo && rateLimitInfo.blockedUntil) {
      const updateTimer = () => {
        const now = Date.now()
        const timeRemaining = rateLimitInfo.blockedUntil - now
        if (timeRemaining <= 0) {
          setRateLimitInfo(null)
          setCooldownTimer(null)
          setError('')
        } else {
          setCooldownTimer(formatTimeRemaining(timeRemaining))
        }
      }
      updateTimer()
      const interval = setInterval(updateTimer, 1000)
      return () => clearInterval(interval)
    }
  }, [rateLimitInfo])

  const formatTimeRemaining = (ms) => {
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  const handlePinLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!phoneNumber) {
      setError('Introduceți numărul de telefon')
      setLoading(false)
      return
    }
    if (!pin) {
      setError('Introduceți PIN-ul')
      setLoading(false)
      return
    }

    const result = await loginWithPin(pin, phoneNumber)

    if (result.success) {
      setRateLimitInfo(null)
      setCooldownTimer(null)
      setError('')
      router.push('/dashboard')
    } else {
      if (result.suspended) {
        setRateLimitInfo(null)
        setCooldownTimer(null)
        setError(result.error)
        setLoading(false)
        return
      }
      if (result.rateLimited) {
        setRateLimitInfo({
          level: result.level,
          blockedUntil: result.blockedUntil,
          timeRemaining: result.timeRemaining
        })
      } else {
        setRateLimitInfo(null)
        setCooldownTimer(null)
      }
      setError(result.error)
      setLoading(false)
    }
  }

  const isBlocked = rateLimitInfo && cooldownTimer

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
    }}>
      {/* Left — Form */}
      <div style={{
        flex: isMobile ? '1' : '0 0 480px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: isMobile ? '40px 24px' : '60px 64px',
        backgroundColor: '#ffffff',
        minHeight: '100vh'
      }}>
        <div style={{ width: '100%', maxWidth: '340px', margin: '0 auto' }}>
          {/* Logo */}
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '32px'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21,15 16,10 5,21"/>
            </svg>
          </div>

          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#111827',
            margin: '0 0 8px 0',
            letterSpacing: '-0.5px'
          }}>
            Bine ai revenit
          </h1>
          <p style={{
            fontSize: '15px',
            color: '#6b7280',
            margin: '0 0 36px 0',
            lineHeight: '1.5'
          }}>
            Introduceți datele pentru a accesa albumul familiei
          </p>

          <form onSubmit={handlePinLogin} autoComplete="on">
            <input
              type="text"
              name="username"
              autoComplete="username"
              value="family-album-user"
              readOnly
              tabIndex="-1"
              style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
            />

            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="phone" style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '500',
                color: '#6b7280',
                marginBottom: '8px',
                letterSpacing: '0.3px'
              }}>
                NUMĂR DE TELEFON
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="061234567"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '15px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  color: '#111827',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#7c3aed'
                  e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.08)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label htmlFor="pin" style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '500',
                color: '#6b7280',
                marginBottom: '8px',
                letterSpacing: '0.3px'
              }}>
                PIN
              </label>
              <input
                id="pin"
                name="password"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="current-password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                maxLength="8"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '18px',
                  fontFamily: '"SF Mono", Monaco, "Cascadia Code", monospace',
                  textAlign: 'center',
                  letterSpacing: '6px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  color: '#111827',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#7c3aed'
                  e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.08)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* Hint */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '6px',
              marginBottom: '28px',
              fontSize: '12px',
              color: '#9ca3af'
            }}>
              <span style={{
                padding: '3px 8px',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px'
              }}>4 cifre — Viewer</span>
              <span style={{
                padding: '3px 8px',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px'
              }}>8 cifre — Editor</span>
            </div>

            {/* Rate Limit */}
            {isBlocked && (
              <div style={{
                marginBottom: '20px',
                padding: '12px 14px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '10px',
                fontSize: '14px',
                color: '#92400e'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                  {rateLimitInfo.level === 1 ? 'Cooldown 10 minute' : 'Cooldown 24 ore'}
                </div>
                <div style={{ fontSize: '13px' }}>
                  Timp rămas: <strong>{cooldownTimer}</strong>
                </div>
              </div>
            )}

            {/* Error */}
            {error && !isBlocked && (
              <div style={{
                marginBottom: '20px',
                padding: '12px 14px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                color: '#dc2626',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isBlocked}
              style={{
                width: '100%',
                padding: '13px',
                fontSize: '15px',
                fontWeight: '600',
                color: 'white',
                background: (loading || isBlocked) ? '#d1d5db' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                border: 'none',
                borderRadius: '10px',
                cursor: (loading || isBlocked) ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s, transform 0.1s'
              }}
              onMouseOver={(e) => { if (!loading && !isBlocked) e.target.style.opacity = '0.9' }}
              onMouseOut={(e) => { if (!loading && !isBlocked) e.target.style.opacity = '1' }}
              onMouseDown={(e) => { if (!loading && !isBlocked) e.target.style.transform = 'scale(0.98)' }}
              onMouseUp={(e) => { if (!loading && !isBlocked) e.target.style.transform = 'scale(1)' }}
            >
              {loading ? 'Se conectează...' : isBlocked ? `Blocat (${cooldownTimer})` : 'Intră în album'}
            </button>
          </form>

          <div style={{
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid #f3f4f6',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>
              Amintirile tale sunt în siguranță
            </p>
          </div>
        </div>
      </div>

      {/* Right — Visual Panel */}
      {!isMobile && (
        <div style={{
          flex: 1,
          background: 'linear-gradient(145deg, #4c1d95 0%, #6d28d9 35%, #7c3aed 65%, #8b5cf6 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          padding: '60px'
        }}>
          {/* Decorative blobs */}
          <div style={{
            position: 'absolute',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%)',
            top: '-15%',
            right: '-15%'
          }} />
          <div style={{
            position: 'absolute',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 60%)',
            bottom: '-10%',
            left: '-10%'
          }} />
          <div style={{
            position: 'absolute',
            width: '250px',
            height: '250px',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.08)',
            top: '30%',
            left: '10%'
          }} />
          <div style={{
            position: 'absolute',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.06)',
            bottom: '20%',
            right: '15%'
          }} />
          <div style={{
            position: 'absolute',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.04)',
            top: '15%',
            left: '35%'
          }} />

          {/* Content */}
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '400px' }}>
            {/* Photo frame icon */}
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              backgroundColor: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 36px',
              backdropFilter: 'blur(10px)'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21,15 16,10 5,21"/>
              </svg>
            </div>

            <h2 style={{
              fontSize: '36px',
              fontWeight: '700',
              color: '#ffffff',
              margin: '0 0 16px 0',
              letterSpacing: '-0.5px',
              lineHeight: '1.15'
            }}>
              Amintiri<br />de familie
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255,255,255,0.65)',
              margin: '0 0 48px 0',
              lineHeight: '1.6'
            }}>
              Albumul tău digital securizat unde<br />
              fiecare moment contează
            </p>

            {/* Feature pills */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '8px'
            }}>
              {['Fotografii', 'Momente', 'Familie', 'Securizat'].map((label) => (
                <span key={label} style={{
                  padding: '8px 16px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '20px',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '13px',
                  fontWeight: '500',
                  backdropFilter: 'blur(10px)'
                }}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
