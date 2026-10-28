import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useLanguage } from '../contexts/LanguageContext'
import { isValidPhone, formatPhoneDisplay } from '../lib/phone'
import { formatWaitTime } from '../lib/pinAuth'
import LanguagePicker from '../components/LanguagePicker'
import PhoneInput from '../components/PhoneInput'

const CHANNEL_REFUSALS = {
  signupEmailUnavailable: 'email',
  signupSmsUnavailable: 'sms',
  signupSmsCountryUnsupported: 'sms',
}

export default function Signup() {
  const router = useRouter()
  const { t, language, locale } = useLanguage()
  const [step, setStep] = useState('details')
  const [channel, setChannel] = useState('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [suggestion, setSuggestion] = useState(null)
  const [refusedChannels, setRefusedChannels] = useState([])

  const [familyName, setFamilyName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState('')

  const [credentials, setCredentials] = useState(null)

  const isSms = channel === 'sms'

  const clearError = () => {
    setError('')
    setSuggestion(null)
  }

  const switchChannel = (next) => {
    setChannel(next)
    clearError()
  }

  const contactBody = () => (isSms ? { phoneNumber: phone } : { email: email.trim() })

  const failWith = (data, fallbackKey) => {
    const refused = CHANNEL_REFUSALS[data?.errorKey]
    if (refused) {
      const tried = refusedChannels.includes(refused) ? refusedChannels : [...refusedChannels, refused]
      const next = refused === 'sms' ? 'email' : 'sms'
      setRefusedChannels(tried)
      if (data.otherChannelAvailable === true && !tried.includes(next)) {
        setError(t(data.errorKey))
        setSuggestion({ next, label: t(next === 'sms' ? 'signupUseSmsInstead' : 'signupUseEmailInstead') })
      } else {
        setError(t('signupUnavailable'))
        setSuggestion(null)
      }
      return
    }
    const key = data?.errorKey || fallbackKey
    setSuggestion(null)
    setError(data?.retryAfterMs
      ? t(key, { time: formatWaitTime(data.retryAfterMs, locale) })
      : t(key))
  }

  const submitDetails = async (e) => {
    e.preventDefault()
    clearError()
    if (isSms && !isValidPhone(phone)) {
      setError(t('authErrPhoneInvalid'))
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyName,
          ...contactBody(),
          channel,
          lang: language,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        failWith(data, 'signupFailed')
        return
      }
      setDevCode(data.devCode || '')
      setCode('')
      setStep('code')
    } catch (err) {
      console.error('signup-request failed', err)
      setError(t('forgotNetworkError'))
    } finally {
      setLoading(false)
    }
  }

  const submitCode = async (e) => {
    e.preventDefault()
    clearError()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          ...contactBody(),
          code,
          lang: language,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        failWith(data, 'signupCodeVerifyFailed')
        return
      }

      setCredentials({ viewerPin: data.viewerPin, editorPin: data.editorPin })
      setStep('done')
    } catch (err) {
      console.error('signup-verify failed', err)
      setError(t('forgotNetworkError'))
    } finally {
      setLoading(false)
    }
  }

  const subtitle =
    step === 'details' ? t(isSms ? 'signupDetailsSubtitleSms' : 'signupDetailsSubtitle')
    : step === 'code' ? (isSms
      ? t('signupCodeSubtitleSms', { phone: formatPhoneDisplay(phone) })
      : t('signupCodeSubtitle', { email: email.trim() }))
    : t(isSms ? 'signupDoneSubtitleSms' : 'signupDoneSubtitle')

  const emailField = (
    <div key="email">
      <label htmlFor="signup-email" className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>
        {t('authEmailShort')}
      </label>
      <input
        id="signup-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input-glass"
        placeholder={t('signupEmailPlaceholder')}
        autoComplete="email"
        required
      />
    </div>
  )

  const phoneField = (
    <div key="phone">
      <label htmlFor="signup-phone" className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{t('authPhoneShort')}</label>
      <PhoneInput id="signup-phone" value={phone} onChange={setPhone} required />
      <p className="text-subtle" style={{ fontSize: 11.5, margin: '6px 2px 0', lineHeight: 1.4 }}>
        {t('phoneInputHint')}
      </p>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '76px 20px 20px',
      position: 'relative',
    }}>
      <Head>
        <title>{`${t('signupTitle')} · BabyJourney`}</title>
      </Head>
      <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 16px)', right: 16, zIndex: 2 }}>
        <LanguagePicker />
      </div>
      <div className="card-glass" style={{ width: '100%', maxWidth: 440, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 className="text-display" style={{ fontSize: 26, marginBottom: 6 }}>
            {step === 'done' ? t('signupDoneTitle') : t('signupTitle')}
          </h1>
          <p className="text-subtle" style={{ fontSize: 13.5, margin: 0 }}>
            {subtitle}
          </p>
        </div>

        {error && (
          <div role="alert" className="glass-soft" style={{
            padding: '12px 14px',
            marginBottom: 16,
            borderRadius: 14,
            border: '1px solid rgba(239, 68, 68, 0.45)',
            background: 'rgba(239, 68, 68, 0.10)',
            color: 'var(--accent-red)',
            fontSize: 13,
            fontWeight: 600,
          }}>
            {error}
            {suggestion && step === 'details' && (
              <button
                type="button"
                onClick={() => switchChannel(suggestion.next)}
                className="btn-glass"
                style={{ display: 'flex', width: '100%', justifyContent: 'center', marginTop: 10, padding: '8px 12px', fontSize: 13 }}
              >
                {suggestion.label}
              </button>
            )}
          </div>
        )}

        {step === 'details' && (
          <form onSubmit={submitDetails} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label htmlFor="signup-family" className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{t('signupFamilyNameLabel')}</label>
              <input
                id="signup-family"
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                className="input-glass"
                placeholder={t('signupFamilyNamePlaceholder')}
                required
              />
            </div>
            <div>
              <span className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{t('signupChannelLabel')}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => switchChannel('email')}
                  aria-pressed={!isSms}
                  className={`category-pill${!isSms ? ' category-pill--selected sheen' : ''}`}
                  style={{ flex: 1 }}
                >
                  ✉️ {t('authEmailShort')}
                </button>
                <button
                  type="button"
                  onClick={() => switchChannel('sms')}
                  aria-pressed={isSms}
                  className={`category-pill${isSms ? ' category-pill--selected sheen' : ''}`}
                  style={{ flex: 1 }}
                >
                  💬 {t('signupChannelSms')}
                </button>
              </div>
            </div>
            {isSms ? phoneField : emailField}
            <button type="submit" disabled={loading} className="btn-iris sheen" style={{ padding: '13px 16px', justifyContent: 'center', marginTop: 4 }}>
              {loading ? t('authSending') : t('authSendCode')}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={submitCode} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {devCode && (
              <div className="glass-soft" style={{ padding: '10px 12px', borderRadius: 12, fontSize: 12.5 }}>
                <strong>{t('signupDevModeLabel')}</strong> {t(isSms ? 'signupDevCodeNoticeSms' : 'signupDevCodeNotice')}{' '}
                <span className="nums" style={{ fontWeight: 700, letterSpacing: 2 }}>{devCode}</span>
              </div>
            )}
            <div>
              <label htmlFor="signup-code" className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{t('authVerificationCode')}</label>
              <input
                id="signup-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={4}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="input-glass nums"
                placeholder="1234"
                style={{ textAlign: 'center', fontSize: 26, letterSpacing: 10, fontWeight: 700 }}
                autoFocus
                required
              />
            </div>
            <button type="submit" disabled={loading || code.length !== 4} className="btn-iris sheen" style={{ padding: '13px 16px', justifyContent: 'center' }}>
              {loading ? t('signupVerifying') : t('confirm')}
            </button>
            <button
              type="button"
              onClick={() => { setStep('details'); setCode(''); setDevCode(''); clearError() }}
              className="btn-glass"
              style={{ padding: '10px 16px', justifyContent: 'center' }}
            >
              ← {t('signupChangeDetails')}
            </button>
          </form>
        )}

        {step === 'done' && credentials && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <PinCard
              label={t('signupViewerPinLabel')}
              hint={t('signupViewerPinHint')}
              pin={credentials.viewerPin}
            />
            <PinCard
              label={t('signupEditorPinLabel')}
              hint={t('signupEditorPinHint')}
              pin={credentials.editorPin}
            />
            <button
              onClick={() => router.push('/login')}
              className="btn-iris sheen"
              style={{ padding: '13px 16px', justifyContent: 'center', marginTop: 4 }}
            >
              {t('signupGoToLogin')}
            </button>
          </div>
        )}

        {step !== 'done' && (
          <p className="text-subtle" style={{ textAlign: 'center', fontSize: 13, marginTop: 20, marginBottom: 0 }}>
            {t('signupHaveAccount')} <Link href="/login" style={{ color: 'var(--accent-iris)', fontWeight: 600 }}>{t('signupLoginLink')}</Link>
            {step === 'code' && (
              <>
                {' · '}
                <Link href="/forgot-password" style={{ color: 'var(--accent-iris)', fontWeight: 600 }}>{t('loginForgotPin')}</Link>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  )
}

function PinCard({ label, hint, pin }) {
  return (
    <div className="glass-soft" style={{ padding: 16, borderRadius: 16 }}>
      <div className="text-eyebrow" style={{ marginBottom: 6 }}>{label}</div>
      <div className="nums" style={{
        fontSize: 28,
        fontWeight: 700,
        letterSpacing: 6,
        color: 'var(--accent-iris)',
        marginBottom: 6,
      }}>
        {pin}
      </div>
      <div className="text-subtle" style={{ fontSize: 11.5, lineHeight: 1.4 }}>{hint}</div>
    </div>
  )
}
