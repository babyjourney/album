// Self-registration (item 14).
//
// The previous version of this page called supabase.auth.signUp() — the Supabase
// Auth system, which this app does not use for anything. It wrote to auth.users,
// never created a `families` row, and the resulting "account" could not log in
// via /login (which is PIN-based). It was also unreachable: nothing linked here.
//
// The real flow, matching the rest of the app's auth model:
//   1. Name + email + phone   -> POST /api/auth/signup-request  (emails a 4-digit code)
//   2. Enter the 4-digit code -> POST /api/auth/signup-verify   (creates the family)
//   3. Show the PINs, which are emailed too.

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useLanguage } from '../contexts/LanguageContext'
import LanguagePicker from '../components/LanguagePicker'

// (Sergiu batch3 #5) Registration hard-coded the Moldovan "069…" format. The
// country picker supplies the dial code so the user types only the local number,
// and we store a full international (E.164) number. Moldova first — that's where
// the clients are — then the countries the diaspora actually lives in.
const COUNTRIES = [
  { code: 'MD', flag: '🇲🇩', dial: '+373' },
  { code: 'RO', flag: '🇷🇴', dial: '+40' },
  { code: 'RU', flag: '🇷🇺', dial: '+7' },
  { code: 'UA', flag: '🇺🇦', dial: '+380' },
  { code: 'IT', flag: '🇮🇹', dial: '+39' },
  { code: 'DE', flag: '🇩🇪', dial: '+49' },
  { code: 'FR', flag: '🇫🇷', dial: '+33' },
  { code: 'ES', flag: '🇪🇸', dial: '+34' },
  { code: 'PT', flag: '🇵🇹', dial: '+351' },
  { code: 'GB', flag: '🇬🇧', dial: '+44' },
  { code: 'US', flag: '🇺🇸', dial: '+1' },
]
const dialOf = (code) => COUNTRIES.find((c) => c.code === code)?.dial || ''

export default function Signup() {
  const router = useRouter()
  const { t } = useLanguage()
  const [step, setStep] = useState('details') // details | code | done
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [familyName, setFamilyName] = useState('')
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState('MD')
  const [phoneNumber, setPhoneNumber] = useState('') // local part only, digits

  // Full international number: dial code + local digits (leading zeros dropped,
  // since the dial code replaces the national trunk "0"). E.g. MD + "069010712"
  // -> "+37369010712".
  const fullPhone = () => `${dialOf(country)}${phoneNumber.replace(/\D/g, '').replace(/^0+/, '')}`

  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState('')

  const [credentials, setCredentials] = useState(null) // { viewerPin, editorPin }

  const submitDetails = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyName, email, phoneNumber: fullPhone() }),
      })
      const data = await res.json()
      // Prefer the localized key (Sergiu batch3 #8); fall back to the server's
      // Romanian string, then a generic message.
      if (!res.ok) throw new Error(data.errorKey ? t(data.errorKey) : (data.error || t('signupFailed')))

      // Only present when email delivery isn't configured AND we're in dev.
      if (data.devCode) setDevCode(data.devCode)
      setStep('code')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const submitCode = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.errorKey ? t(data.errorKey) : (data.error || t('signupCodeVerifyFailed')))

      setCredentials({ viewerPin: data.viewerPin, editorPin: data.editorPin })
      setStep('done')
    } catch (err) {
      setError(err.message)
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
      padding: 20,
      position: 'relative',
    }}>
      {/* (Sergiu batch3 #6) Language switch on the entry screen itself. */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 2 }}>
        <LanguagePicker />
      </div>
      <div className="card-glass" style={{ width: '100%', maxWidth: 440, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 className="text-display" style={{ fontSize: 26, marginBottom: 6 }}>
            {step === 'done' ? t('signupDoneTitle') : t('signupTitle')}
          </h1>
          <p className="text-subtle" style={{ fontSize: 13.5, margin: 0 }}>
            {step === 'details' && t('signupDetailsSubtitle')}
            {step === 'code' && t('signupCodeSubtitle', { email })}
            {step === 'done' && t('signupDoneSubtitle')}
          </p>
        </div>

        {error && (
          <div className="glass-soft" style={{
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
          </div>
        )}

        {step === 'details' && (
          <form onSubmit={submitDetails} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{t('signupFamilyNameLabel')}</label>
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                className="input-glass"
                placeholder={t('signupFamilyNamePlaceholder')}
                required
              />
            </div>
            <div>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{t('authEmailShort')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-glass"
                placeholder={t('signupEmailPlaceholder')}
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{t('authPhoneShort')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="input-glass"
                  aria-label={t('signupCountryLabel')}
                  style={{ flex: '0 0 auto', width: 116, paddingRight: 8 }}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.flag} {c.dial}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d]/g, ''))}
                  className="input-glass"
                  placeholder="69123456"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  required
                  style={{ flex: 1 }}
                />
              </div>
              <p className="text-subtle" style={{ fontSize: 11.5, margin: '6px 2px 0', lineHeight: 1.4 }}>
                {t('signupPhoneHint', { dial: dialOf(country) })}
              </p>
            </div>
            <button type="submit" disabled={loading} className="btn-iris sheen" style={{ padding: '13px 16px', justifyContent: 'center', marginTop: 4 }}>
              {loading ? t('authSending') : t('authSendCode')}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={submitCode} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {devCode && (
              <div className="glass-soft" style={{ padding: '10px 12px', borderRadius: 12, fontSize: 12.5 }}>
                <strong>Development:</strong> {t('signupDevCodeNotice')}{' '}
                <span className="nums" style={{ fontWeight: 700, letterSpacing: 2 }}>{devCode}</span>
              </div>
            )}
            <div>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{t('authVerificationCode')}</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
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
              onClick={() => { setStep('details'); setCode(''); setError('') }}
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
