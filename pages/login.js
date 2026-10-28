import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { loginWithPin, isAuthenticated, formatCountdown, formatWaitTime } from '../lib/pinAuth'
import { useLanguage } from '../contexts/LanguageContext'
import { isValidPhone } from '../lib/phone'
import LanguagePicker from '../components/LanguagePicker'
import PhoneInput from '../components/PhoneInput'

export default function Login() {
  const router = useRouter()
  const { t, language, locale } = useLanguage()
  const [pin, setPin] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [channel, setChannel] = useState('phone')
  const [otpStep, setOtpStep] = useState(false)
  const [otpDeliveryHint, setOtpDeliveryHint] = useState(null)
  const [otpDeliveryTo, setOtpDeliveryTo] = useState(null)
  const [otpFallback, setOtpFallback] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rateLimitInfo, setRateLimitInfo] = useState(null)
  const [cooldownTimer, setCooldownTimer] = useState(null)

  useEffect(() => {
    if (isAuthenticated()) router.push('/dashboard')
  }, [])

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
          setCooldownTimer(formatCountdown(remaining, locale))
        }
      }
      tick()
      const id = setInterval(tick, 1000)
      return () => clearInterval(id)
    }
  }, [rateLimitInfo, locale])

  const contactPayload = () => (
    channel === 'email'
      ? { email: email.trim() }
      : { phoneNumber }
  )

  const resetOtp = () => {
    setOtpStep(false)
    setOtpCode('')
    setOtpDeliveryTo(null)
    setOtpFallback(false)
  }

  const keyedError = (result, fallbackKey) => t(
    result.errorKey || fallbackKey,
    result.retryAfterMs ? { time: formatWaitTime(result.retryAfterMs, locale) } : {}
  )

  const attemptsRemainingText = (n) => {
    let form = 'other'
    try { form = new Intl.PluralRules(locale).select(n) } catch {}
    const key = { one: 'loginAttemptsRemainingOne', few: 'loginAttemptsRemainingFew', many: 'loginAttemptsRemainingMany' }[form] || 'loginAttemptsRemaining'
    return t(key, { n })
  }

  const resolveError = (result) => {
    let msg = keyedError(result, 'authErrServer')
    if (!result.rateLimited && result.attemptsRemaining != null &&
        result.attemptsRemaining > 0 && result.attemptsRemaining <= 2) {
      msg = `${msg} ${attemptsRemainingText(result.attemptsRemaining)}`
    }
    return msg
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (channel === 'phone' && !phoneNumber) {
      setError(t('loginErrorPhoneRequired'))
      return
    }
    if (channel === 'phone' && !isValidPhone(phoneNumber)) {
      setError(t('authErrPhoneInvalid'))
      return
    }
    if (channel === 'email' && !email) {
      setError(t('loginErrorEmailRequired'))
      return
    }
    if (!pin) {
      setError(t('loginErrorPinRequired'))
      return
    }
    if (otpStep && !otpCode) {
      setError(t('loginErrorOtpRequired'))
      return
    }

    setLoading(true)
    const result = await loginWithPin({
      pin,
      ...contactPayload(),
      otpCode: otpStep ? otpCode : undefined,
      lang: language,
    })
    applyLoginResult(result)
  }

  const applyLoginResult = (result) => {
    if (result.success) {
      setRateLimitInfo(null); setCooldownTimer(null); setError('')
      router.push('/dashboard')
      return
    }

    if (result.otpRequired) {
      setOtpStep(true)
      if (result.code === 'OTP_INVALID') {
        setError(resolveError(result))
      } else {
        setOtpCode('')
        setOtpDeliveryHint(result.deliveryHint || null)
        setOtpDeliveryTo(result.deliveryTo || null)
        setOtpFallback(result.fallback === true)
        setError(result.errorKey === 'loginOtpResendLimited' || result.errorKey === 'loginOtpLockout' ? keyedError(result) : '')
      }
      setLoading(false)
      return
    }

    if (result.suspended) {
      setRateLimitInfo(null); setCooldownTimer(null); setError(resolveError(result)); setLoading(false); return
    }
    if (result.rateLimited) {
      setRateLimitInfo({
        level: result.level,
        blockedUntil: result.retryAfterMs ? Date.now() + result.retryAfterMs : result.blockedUntil,
        timeRemaining: result.timeRemaining,
      })
    } else {
      setRateLimitInfo(null); setCooldownTimer(null)
    }
    setError(resolveError(result))
    setLoading(false)
  }

  const handleResendOtp = async () => {
    setError('')
    if (!pin) {
      setError(t('loginErrorPinRequired'))
      return
    }
    setLoading(true)
    const result = await loginWithPin({ pin, ...contactPayload(), lang: language })
    if (!result.success && !result.otpRequired && !result.rateLimited && !result.errorKey) {
      setError(t('loginErrorResendFailed'))
      setLoading(false)
      return
    }
    applyLoginResult(result)
  }

  const isBlocked = rateLimitInfo && cooldownTimer
  const codeChannel = otpFallback
    ? (otpDeliveryHint === 'email' ? 'phone' : 'email')
    : otpDeliveryHint

  return (
    <>
      <Head>
        <title>{t('loginPageTitle')}</title>
        <meta name="description" content={t('loginMetaDescription')} />
        <meta name="keywords" content="album familie, BabyJourney, jurnal bebe, amintiri copii, album privat, Chișinău, Moldova, foto familie, jurnal nou-nascut" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="BabyJourney — Album privat de familie" />
        <meta property="og:description" content="Albumul tău privat de familie. Toate momentele copilăriei într-un singur loc, în siguranță." />
        <meta property="og:image" content="https://album.babyjourney.life/img/pfp.webp" />
        <meta property="og:image:alt" content="Logo BabyJourney — album privat de familie din Chișinău" />
        <meta property="og:image:width" content="900" />
        <meta property="og:image:height" content="898" />
        <meta property="og:locale" content="ro_RO" />
        <meta property="og:site_name" content="BabyJourney" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="BabyJourney — Album privat de familie" />
        <meta name="twitter:description" content="Toate momentele copilăriei într-un singur loc." />
        <meta name="twitter:image" content="https://album.babyjourney.life/img/pfp.webp" />
        <meta name="geo.region" content="MD-CU" />
        <meta name="geo.placename" content="Chișinău, Moldova" />
        <link rel="canonical" href="https://album.babyjourney.life/login" />
      </Head>
      <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '76px 24px 24px',
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 16px)', right: 16, zIndex: 2 }}>
        <LanguagePicker />
      </div>

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
            {t('loginTitle')}
          </h1>
          <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
            {t('loginSubtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} autoComplete="on" className="modal-glass" style={{
          padding: '32px 28px',
          gap: 0,
          animationDelay: '60ms',
        }}>
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
              {t('loginPinResetSuccess')}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button
              type="button"
              onClick={() => { setChannel('phone'); resetOtp() }}
              className={`category-pill${channel === 'phone' ? ' category-pill--selected sheen' : ''}`}
              style={{ flex: 1 }}
            >
              📱 {t('authPhoneShort')}
            </button>
            <button
              type="button"
              onClick={() => { setChannel('email'); resetOtp() }}
              className={`category-pill${channel === 'email' ? ' category-pill--selected sheen' : ''}`}
              style={{ flex: 1 }}
            >
              ✉️ {t('authEmailShort')}
            </button>
          </div>

          {channel === 'phone' ? (
            <>
              <label htmlFor="phone" className="text-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
                {t('authPhoneLabel')}
              </label>
              <div style={{ marginBottom: 18 }}>
                <PhoneInput
                  id="phone"
                  value={phoneNumber}
                  onChange={(next) => { setPhoneNumber(next); resetOtp() }}
                  required
                />
              </div>
            </>
          ) : (
            <>
              <label htmlFor="email" className="text-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
                {t('authEmailLabel')}
              </label>
              <input
                id="email" name="email" type="email" autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); resetOtp() }}
                placeholder={t('authEmailPlaceholder')}
                required
                className="input-glass"
                style={{ marginBottom: 18 }}
              />
            </>
          )}

          <label htmlFor="pin" className="text-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
            {t('loginPinLabel')}
          </label>
          <input
            id="pin" name="password" type="password" inputMode="numeric"
            pattern="[0-9]*" autoComplete="current-password"
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); if (otpStep) resetOtp() }}
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

          {otpStep && (
            <>
              <label htmlFor="otp" className="text-eyebrow" style={{ display: 'block', marginBottom: 8, marginTop: 6 }}>
                {t('authVerificationCode')} {codeChannel ? `(${codeChannel === 'email' ? t('loginOtpHintEmail') : t('signupChannelSms')})` : ''}
              </label>
              {otpDeliveryTo && (
                <p style={{ fontSize: 12.5, color: 'var(--ink-2)', margin: '-2px 0 8px' }}>
                  {codeChannel === 'email'
                    ? t('loginOtpSentEmail', { to: otpDeliveryTo })
                    : t('loginOtpSentSms', { to: otpDeliveryTo })}
                </p>
              )}
              <input
                id="otp" name="otp" type="text" inputMode="numeric" pattern="[0-9]*" maxLength="4"
                autoComplete="one-time-code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • •"
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
                {t('loginResendCode')}
              </button>
            </>
          )}

          <div style={{
            display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24,
          }}>
            <span className="glass-pill" style={{ padding: '6px 12px', fontSize: 12, color: 'var(--ink-2)' }}>
              {t('loginViewerPinHint')}
            </span>
            <span className="glass-pill" style={{ padding: '6px 12px', fontSize: 12, color: 'var(--ink-2)' }}>
              {t('loginEditorPinHint')}
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
                {rateLimitInfo.level === 1
                  ? t('loginCooldown10Min')
                  : rateLimitInfo.level === 2 ? t('loginCooldown24H') : t('errRateLimited')}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                {t('loginTimeRemaining')} <strong className="nums">{cooldownTimer}</strong>
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
            {loading ? t('loginSubmitting') : isBlocked ? t('loginBlocked', { time: cooldownTimer }) : t('loginSubmit')}
          </button>

          <div style={{
            marginTop: 22, paddingTop: 18,
            borderTop: '1px solid var(--glass-hairline)',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
              {t('loginSafeNote')}
            </p>
          </div>
        </form>

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
              {t('loginForgotPin')}
            </a>
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: 'var(--ink-2)' }}>
          {t('loginNoAccount')}{' '}
          <Link href="/signup" legacyBehavior>
            <a style={{ color: 'var(--accent-iris)', fontWeight: 600, textDecoration: 'none' }}>
              {t('signupTitle')}
            </a>
          </Link>
        </div>

        <div style={{
          textAlign: 'center', marginTop: 22,
          fontSize: 12, color: 'var(--ink-3)',
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          {t('loginTagline')}
        </div>

        <div style={{
          textAlign: 'center', marginTop: 18,
          fontSize: 12, color: 'var(--ink-3)',
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <Link href="/terms" legacyBehavior><a style={{ color: 'inherit', textDecoration: 'none' }}>{t('footerTerms')}</a></Link>
          <span aria-hidden>·</span>
          <Link href="/privacy" legacyBehavior><a style={{ color: 'inherit', textDecoration: 'none' }}>{t('footerPrivacy')}</a></Link>
          <span aria-hidden>·</span>
          <Link href="/cookies" legacyBehavior><a style={{ color: 'inherit', textDecoration: 'none' }}>{t('footerCookies')}</a></Link>
          <span aria-hidden>·</span>
          <Link href="/demo" legacyBehavior><a style={{ color: 'inherit', textDecoration: 'none' }}>{t('footerDemo')}</a></Link>
        </div>
      </div>
    </div>
    </>
  )
}
