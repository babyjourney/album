import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { loginWithPin, isAuthenticated, requestLoginOtp } from '../lib/pinAuth'

export default function Login() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  // 'phone' | 'email' — how the user wants to identify themselves
  const [channel, setChannel] = useState('phone')
  // 2FA second step is only shown when the server tells us OTP is required.
  // The login is a single submit unless the family has require_otp_login=true.
  const [otpStep, setOtpStep] = useState(false)
  const [otpDeliveryHint, setOtpDeliveryHint] = useState(null)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rateLimitInfo, setRateLimitInfo] = useState(null)
  const [cooldownTimer, setCooldownTimer] = useState(null)

  useEffect(() => {
    if (isAuthenticated()) router.push('/dashboard')
  }, [])

  // Show a success banner when the user lands here from /forgot-password.
  useEffect(() => {
    if (router.query.reset === 'ok') setResetSuccess(true)
  }, [router.query.reset])

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

  const contactPayload = () => (
    channel === 'email'
      ? { email: email.trim() }
      : { phoneNumber: phoneNumber.trim() }
  )

  // Single login submit. We first call /api/auth/request-otp to find out
  // whether this family has 2FA enabled. If yes, we collect the OTP code
  // before calling pin-login. If no, we go straight to pin-login.
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (channel === 'phone' && !phoneNumber) {
      setError('Introduceți numărul de telefon')
      return
    }
    if (channel === 'email' && !email) {
      setError('Introduceți adresa de email')
      return
    }
    if (!pin) {
      setError('Introduceți PIN-ul')
      return
    }
    if (otpStep && !otpCode) {
      setError('Introduceți codul de verificare primit')
      return
    }

    setLoading(true)

    // If we're not already in the OTP step, ask the server whether 2FA
    // is required for this contact. This is a non-leaking probe — the
    // endpoint replies the same shape for found and not-found accounts.
    if (!otpStep) {
      const probe = await requestLoginOtp(contactPayload())
      if (probe.success && probe.otpRequired) {
        setOtpStep(true)
        setOtpDeliveryHint(probe.deliveryHint)
        setLoading(false)
        return
      }
      // Either probe.success === false (network error) or otpRequired === false.
      // In either case, fall through to pin-login: it will return OTP_REQUIRED
      // again if the server thinks 2FA is needed.
    }

    const result = await loginWithPin({
      pin,
      ...contactPayload(),
      otpCode: otpStep ? otpCode : undefined,
    })

    if (result.success) {
      setRateLimitInfo(null); setCooldownTimer(null); setError('')
      router.push('/dashboard')
      return
    }

    // Server told us OTP is required (covers the case where the probe
    // missed — e.g. user changed phone after request-otp).
    if (result.otpRequired) {
      setOtpStep(true)
      setOtpDeliveryHint(result.deliveryHint || null)
      setError(result.code === 'OTP_INVALID' ? result.error : '')
      setLoading(false)
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

  const handleResendOtp = async () => {
    setError('')
    setLoading(true)
    const probe = await requestLoginOtp(contactPayload())
    setLoading(false)
    if (!probe.success) {
      setError(probe.error || 'Nu am putut retrimite codul.')
      return
    }
    setOtpDeliveryHint(probe.deliveryHint || otpDeliveryHint)
  }

  const isBlocked = rateLimitInfo && cooldownTimer

  return (
    <>
      <Head>
        {/* Task #13 — SEO + social-share metadata for the public album login.
            All image references use absolute Chisinau-tagged WebP filenames
            following the BabyJourney naming convention (see public/img/SEO.md). */}
        <title>Album familie — Intră în BabyJourney</title>
        <meta name="description" content="Albumul tău privat de familie BabyJourney. Conectează-te cu numărul de telefon sau email-ul și PIN-ul de viewer sau editor pentru a vedea amintirile copiilor tăi." />
        <meta name="keywords" content="album familie, BabyJourney, jurnal bebe, amintiri copii, album privat, Chisinau, Moldova, foto familie, jurnal nou-nascut" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="BabyJourney — Album privat de familie" />
        <meta property="og:description" content="Albumul tău privat de familie. Toate momentele copilăriei într-un singur loc, în siguranță." />
        <meta property="og:image" content="https://album.babyjourney.life/img/BabyJourney_couple_with_little_boy.webp" />
        <meta property="og:image:alt" content="Părinți zâmbind cu băiețelul lor — album de familie BabyJourney din Chisinau" />
        <meta property="og:locale" content="ro_RO" />
        <meta property="og:site_name" content="BabyJourney" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="BabyJourney — Album privat de familie" />
        <meta name="twitter:description" content="Toate momentele copilăriei într-un singur loc." />
        <meta name="twitter:image" content="https://album.babyjourney.life/img/BabyJourney_couple_with_little_boy.webp" />
        <meta name="geo.region" content="MD-CU" />
        <meta name="geo.placename" content="Chișinău, Moldova" />
        <link rel="canonical" href="https://album.babyjourney.life/login" />
      </Head>
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

          {resetSuccess && (
            <div role="status" style={{
              marginBottom: 16, padding: '10px 12px',
              background: 'rgba(52,211,153,0.10)',
              border: '1px solid rgba(52,211,153,0.30)',
              borderRadius: 12, color: 'var(--ink-1)',
              backdropFilter: 'blur(12px)', fontSize: 13,
            }}>
              PIN-ul a fost actualizat. Conectează-te cu noul PIN.
            </div>
          )}

          {/* Contact channel selector — phone or email (Task #3) */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button
              type="button"
              onClick={() => { setChannel('phone'); setOtpStep(false); setOtpCode('') }}
              className={`category-pill${channel === 'phone' ? ' category-pill--selected sheen' : ''}`}
              style={{ flex: 1 }}
            >
              📱 Telefon
            </button>
            <button
              type="button"
              onClick={() => { setChannel('email'); setOtpStep(false); setOtpCode('') }}
              className={`category-pill${channel === 'email' ? ' category-pill--selected sheen' : ''}`}
              style={{ flex: 1 }}
            >
              ✉️ Email
            </button>
          </div>

          {channel === 'phone' ? (
            <>
              <label htmlFor="phone" className="text-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
                Număr de telefon
              </label>
              <input
                id="phone" name="phone" type="tel" autoComplete="tel"
                value={phoneNumber}
                onChange={(e) => { setPhoneNumber(e.target.value); setOtpStep(false); setOtpCode('') }}
                placeholder="061234567"
                required
                className="input-glass"
                style={{ marginBottom: 18 }}
              />
            </>
          ) : (
            <>
              <label htmlFor="email" className="text-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
                Adresă de email
              </label>
              <input
                id="email" name="email" type="email" autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setOtpStep(false); setOtpCode('') }}
                placeholder="parinte@email.com"
                required
                className="input-glass"
                style={{ marginBottom: 18 }}
              />
            </>
          )}

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

          {/* OTP step — only rendered when the server says 2FA is required. */}
          {otpStep && (
            <>
              <label htmlFor="otp" className="text-eyebrow" style={{ display: 'block', marginBottom: 8, marginTop: 6 }}>
                Cod de verificare {otpDeliveryHint ? `(${otpDeliveryHint === 'email' ? 'email' : 'SMS'})` : ''}
              </label>
              <input
                id="otp" name="otp" type="text" inputMode="numeric" pattern="[0-9]*" maxLength="6"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                required
                className="input-glass nums"
                style={{
                  textAlign: 'center', letterSpacing: 10, fontSize: 20,
                  fontFamily: '"JetBrains Mono", SF Mono, monospace',
                  marginBottom: 8,
                }}
              />
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                style={{
                  background: 'transparent', border: 'none',
                  color: 'var(--ink-2)', fontSize: 12,
                  cursor: 'pointer', padding: '2px 0', marginBottom: 12,
                }}
              >
                Retrimite codul
              </button>
            </>
          )}

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

        {/* Forgot password — opens email-based PIN reset flow */}
        <div style={{
          textAlign: 'center', marginTop: 18,
        }}>
          <Link href="/forgot-password" legacyBehavior>
            <a style={{
              fontSize: 13,
              color: 'var(--ink-2)',
              textDecoration: 'none',
              borderBottom: '1px dashed var(--glass-hairline-strong)',
              paddingBottom: 1,
            }}>
              Ai uitat PIN-ul?
            </a>
          </Link>
        </div>

        {/* Tagline below */}
        <div style={{
          textAlign: 'center', marginTop: 22,
          fontSize: 12, color: 'var(--ink-3)',
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          Album · Familie · Momente
        </div>

        {/* Legal footer */}
        <div style={{
          textAlign: 'center', marginTop: 18,
          fontSize: 12, color: 'var(--ink-3)',
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <Link href="/terms" legacyBehavior><a style={{ color: 'inherit', textDecoration: 'none' }}>Termeni</a></Link>
          <span aria-hidden>·</span>
          <Link href="/privacy" legacyBehavior><a style={{ color: 'inherit', textDecoration: 'none' }}>Confidențialitate</a></Link>
          <span aria-hidden>·</span>
          <Link href="/cookies" legacyBehavior><a style={{ color: 'inherit', textDecoration: 'none' }}>Cookies</a></Link>
          <span aria-hidden>·</span>
          <Link href="/demo" legacyBehavior><a style={{ color: 'inherit', textDecoration: 'none' }}>Demo</a></Link>
        </div>
      </div>
    </div>
    </>
  )
}
