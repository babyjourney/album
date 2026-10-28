import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { useLanguage } from '../contexts/LanguageContext'
import { isValidPhone, formatPhoneDisplay } from '../lib/phone'
import { formatWaitTime } from '../lib/pinAuth'
import LanguagePicker from '../components/LanguagePicker'
import PhoneInput from '../components/PhoneInput'

export default function ForgotPassword() {
  const router = useRouter()
  const { t, language, locale } = useLanguage()
  const [step, setStep] = useState(1)
  const [channel, setChannel] = useState('phone')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [role, setRole] = useState('viewer')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [sentTo, setSentTo] = useState('')

  const serverError = (data, fallbackKey) => t(
    data?.errorKey || fallbackKey,
    data?.retryAfterMs ? { time: formatWaitTime(data.retryAfterMs, locale) } : {}
  )

  async function handleRequestCode(e) {
    e.preventDefault()
    setError('')
    setNotice('')

    if (channel === 'phone' && !phone) {
      setError(t('forgotErrorPhoneRequired'))
      return
    }
    if (channel === 'phone' && !isValidPhone(phone)) {
      setError(t('authErrPhoneInvalid'))
      return
    }
    if (channel === 'email' && !email.trim()) {
      setError(t('forgotErrorEmailRequired'))
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: channel === 'phone' ? phone : undefined,
          email: channel === 'email' ? email.trim() : undefined,
          role,
          lang: language,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(serverError(data, 'forgotNetworkError'))
        return
      }
      if (data.fallback) {
        setSentTo('')
        setNotice(t(channel === 'email' ? 'otpViaOtherContactEmail' : 'otpViaOtherContactSms'))
      } else {
        setSentTo(channel === 'email' ? email.trim() : formatPhoneDisplay(phone))
        setNotice(`${t(channel === 'email' ? 'forgotNoticeEmail' : 'forgotNoticeSms')} ${t('otpOtherContactHint')}`)
      }
      setStep(2)
    } catch (err) {
      console.error('forgot-pin request failed', err)
      setError(t('forgotNetworkError'))
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPin(e) {
    e.preventDefault()
    setError('')
    setNotice('')

    if (!code.trim()) {
      setError(t('forgotErrorCodeRequired'))
      return
    }
    const cleaned = newPin.replace(/\D/g, '')
    if (role === 'viewer' && !/^\d{4}$/.test(cleaned)) {
      setError(t('forgotErrorViewerPinLength'))
      return
    }
    if (role === 'editor' && !/^\d{8}$/.test(cleaned)) {
      setError(t('forgotErrorEditorPinLength'))
      return
    }
    if (cleaned !== confirmPin.replace(/\D/g, '')) {
      setError(t('forgotErrorPinMismatch'))
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: channel === 'phone' ? phone : undefined,
          email: channel === 'email' ? email.trim() : undefined,
          code: code.trim(),
          newPin: cleaned,
          role,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(serverError(data, 'forgotResetFailed'))
        return
      }
      router.push('/login?reset=ok')
    } catch (err) {
      console.error('reset-pin failed', err)
      setError(t('forgotNetworkError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '76px 24px 24px',
      position: 'relative',
    }}>
      <Head>
        <title>{`${t('forgotTitle')} · BabyJourney`}</title>
      </Head>
      <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 16px)', right: 16, zIndex: 2 }}>
        <LanguagePicker />
      </div>
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '-10%', left: '-8%',
          width: 480, height: 480, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.40) 0%, transparent 60%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-12%', right: '-6%',
          width: 520, height: 520, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(125,211,252,0.40) 0%, transparent 60%)',
          filter: 'blur(48px)',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 460 }} className="animate-glass-in">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 className="text-display" style={{ fontSize: 28, marginBottom: 6 }}>{t('forgotTitle')}</h1>
          <p style={{ color: 'var(--ink-2)', fontSize: 14, margin: 0 }}>
            {t('forgotStepIndicator', {
              step,
              label: step === 1 ? t('forgotStep1Label') : t('forgotStep2Label'),
            })}
          </p>
        </div>

        {step === 1 && (
          <form onSubmit={handleRequestCode} className="modal-glass" style={{ padding: '28px 26px' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              <button
                type="button"
                onClick={() => setChannel('phone')}
                className={`category-pill${channel === 'phone' ? ' category-pill--selected sheen' : ''}`}
                style={{ flex: 1 }}
              >
                📱 {t('authPhoneShort')}
              </button>
              <button
                type="button"
                onClick={() => setChannel('email')}
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
                <div style={{ marginBottom: 16 }}>
                  <PhoneInput id="phone" value={phone} onChange={setPhone} required />
                </div>
              </>
            ) : (
              <>
                <label htmlFor="email" className="text-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
                  {t('authEmailLabel')}
                </label>
                <input
                  id="email" type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('authEmailPlaceholder')}
                  className="input-glass"
                  style={{ marginBottom: 16 }}
                  required
                />
              </>
            )}

            <label className="text-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
              {t('forgotWhichPin')}
            </label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              <button
                type="button"
                onClick={() => setRole('viewer')}
                className={`category-pill${role === 'viewer' ? ' category-pill--selected sheen' : ''}`}
                style={{ flex: 1 }}
              >
                {t('forgotRoleViewer')}
              </button>
              <button
                type="button"
                onClick={() => setRole('editor')}
                className={`category-pill${role === 'editor' ? ' category-pill--selected sheen' : ''}`}
                style={{ flex: 1 }}
              >
                {t('forgotRoleEditor')}
              </button>
            </div>

            {error && (
              <div role="alert" style={{
                marginBottom: 14, padding: '10px 12px',
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.32)',
                borderRadius: 12, color: 'var(--ink-1)', fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-iris sheen" style={{ width: '100%', padding: 13, fontSize: 15, borderRadius: 14 }}>
              {loading ? t('authSending') : t('authSendCode')}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPin} className="modal-glass" style={{ padding: '28px 26px' }}>
            {sentTo && (
              <p className="text-subtle" style={{ marginBottom: 14, fontSize: 13 }}>
                {t('forgotCodeSentTo')} <strong style={{ color: 'var(--ink-1)' }}>{sentTo}</strong>
              </p>
            )}

            <label htmlFor="code" className="text-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
              {t('forgotCodeLabel')}
            </label>
            <input
              id="code" type="text" inputMode="numeric" pattern="[0-9]*" maxLength="4"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="• • • •"
              className="input-glass nums"
              style={{ textAlign: 'center', letterSpacing: 10, fontSize: 22, marginBottom: 16 }}
              required
            />

            <label htmlFor="new-pin" className="text-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
              {role === 'viewer' ? t('forgotNewPinLabel4') : t('forgotNewPinLabel8')}
            </label>
            <input
              id="new-pin" type="password" inputMode="numeric" pattern="[0-9]*"
              maxLength={role === 'viewer' ? 4 : 8}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder={role === 'viewer' ? '• • • •' : '• • • • • • • •'}
              className="input-glass nums"
              style={{ textAlign: 'center', letterSpacing: 8, fontSize: 20, marginBottom: 14 }}
              required
            />

            <label htmlFor="confirm-pin" className="text-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
              {t('forgotConfirmPinLabel')}
            </label>
            <input
              id="confirm-pin" type="password" inputMode="numeric" pattern="[0-9]*"
              maxLength={role === 'viewer' ? 4 : 8}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder={role === 'viewer' ? '• • • •' : '• • • • • • • •'}
              className="input-glass nums"
              style={{ textAlign: 'center', letterSpacing: 8, fontSize: 20, marginBottom: 18 }}
              required
            />

            {notice && (
              <div style={{
                marginBottom: 14, padding: '10px 12px',
                background: 'rgba(52,211,153,0.10)',
                border: '1px solid rgba(52,211,153,0.30)',
                borderRadius: 12, color: 'var(--ink-1)', fontSize: 13,
              }}>
                {notice}
              </div>
            )}

            {error && (
              <div role="alert" style={{
                marginBottom: 14, padding: '10px 12px',
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.32)',
                borderRadius: 12, color: 'var(--ink-1)', fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-iris sheen" style={{ width: '100%', padding: 13, fontSize: 15, borderRadius: 14 }}>
              {loading ? t('forgotUpdating') : t('forgotSubmit')}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                marginTop: 12, background: 'transparent', border: 'none',
                color: 'var(--ink-2)', fontSize: 13, width: '100%', cursor: 'pointer',
              }}
            >
              ← {t('back')}
            </button>
          </form>
        )}

        <div style={{
          textAlign: 'center', marginTop: 18,
          fontSize: 13, color: 'var(--ink-2)',
        }}>
          <Link href="/login" legacyBehavior>
            <a style={{ color: 'inherit', textDecoration: 'none', borderBottom: '1px dashed var(--glass-hairline-strong)', paddingBottom: 1 }}>
              {t('forgotBackToLogin')}
            </a>
          </Link>
        </div>
      </div>
    </div>
  )
}
