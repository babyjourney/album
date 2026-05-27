import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

// PIN reset flow (Task #2). 3-step inline wizard:
//   step 1: pick channel (email / phone) and enter the value
//   step 2: enter the 6-digit OTP we just sent
//   step 3: pick new PIN (4 digits = viewer, 8 = editor) and confirm
// On success we redirect back to /login with a success toast in the URL.

export default function ForgotPassword() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [channel, setChannel] = useState('phone') // 'phone' | 'email'
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [role, setRole] = useState('viewer') // 'viewer' (4d) | 'editor' (8d)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const contactValue = channel === 'email' ? email : phone

  async function handleRequestCode(e) {
    e.preventDefault()
    setError('')
    setNotice('')

    if (channel === 'phone' && !phone.trim()) {
      setError('Introdu numărul de telefon')
      return
    }
    if (channel === 'email' && !email.trim()) {
      setError('Introdu adresa de email')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: channel === 'phone' ? phone.trim() : undefined,
          email: channel === 'email' ? email.trim() : undefined,
          role,
        }),
      })
      // We always advance to step 2 even if the contact wasn't found
      // (the API doesn't leak that information). The user finds out at
      // step 3 if the code doesn't validate.
      setNotice(
        channel === 'email'
          ? 'Dacă există un cont, vei primi codul pe email în câteva secunde.'
          : 'Dacă există un cont, vei primi codul prin SMS în câteva secunde.'
      )
      setStep(2)
    } catch (err) {
      console.error('forgot-pin request failed', err)
      setError('Eroare de rețea. Încearcă din nou.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPin(e) {
    e.preventDefault()
    setError('')
    setNotice('')

    if (!code.trim()) {
      setError('Introdu codul primit')
      return
    }
    const cleaned = newPin.replace(/\D/g, '')
    if (role === 'viewer' && !/^\d{4}$/.test(cleaned)) {
      setError('PIN-ul de viewer trebuie să aibă exact 4 cifre')
      return
    }
    if (role === 'editor' && !/^\d{8}$/.test(cleaned)) {
      setError('PIN-ul de editor trebuie să aibă exact 8 cifre')
      return
    }
    if (cleaned !== confirmPin.replace(/\D/g, '')) {
      setError('Cele două PIN-uri nu coincid')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: channel === 'phone' ? phone.trim() : undefined,
          email: channel === 'email' ? email.trim() : undefined,
          code: code.trim(),
          newPin: cleaned,
          role,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Nu am putut reseta PIN-ul.')
        return
      }
      router.push('/login?reset=ok')
    } catch (err) {
      console.error('reset-pin failed', err)
      setError('Eroare de rețea. Încearcă din nou.')
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
      padding: 24,
      position: 'relative',
    }}>
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
          <h1 className="text-display" style={{ fontSize: 28, marginBottom: 6 }}>Resetează PIN-ul</h1>
          <p style={{ color: 'var(--ink-2)', fontSize: 14, margin: 0 }}>
            Pas {step} din 2 — {step === 1 ? 'verificare contact' : 'cod și PIN nou'}
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
                📱 Telefon
              </button>
              <button
                type="button"
                onClick={() => setChannel('email')}
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
                  id="phone" type="tel" inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="061234567"
                  className="input-glass"
                  style={{ marginBottom: 16 }}
                  required
                />
              </>
            ) : (
              <>
                <label htmlFor="email" className="text-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
                  Adresă de email
                </label>
                <input
                  id="email" type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="parinte@email.com"
                  className="input-glass"
                  style={{ marginBottom: 16 }}
                  required
                />
              </>
            )}

            <label className="text-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
              Ce PIN vrei să resetezi
            </label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              <button
                type="button"
                onClick={() => setRole('viewer')}
                className={`category-pill${role === 'viewer' ? ' category-pill--selected sheen' : ''}`}
                style={{ flex: 1 }}
              >
                Viewer (4 cifre)
              </button>
              <button
                type="button"
                onClick={() => setRole('editor')}
                className={`category-pill${role === 'editor' ? ' category-pill--selected sheen' : ''}`}
                style={{ flex: 1 }}
              >
                Editor (8 cifre)
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
              {loading ? 'Se trimite…' : 'Trimite codul'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPin} className="modal-glass" style={{ padding: '28px 26px' }}>
            <p className="text-subtle" style={{ marginBottom: 14, fontSize: 13 }}>
              Cod trimis către <strong style={{ color: 'var(--ink-1)' }}>{contactValue}</strong>
            </p>

            <label htmlFor="code" className="text-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
              Codul primit (6 cifre)
            </label>
            <input
              id="code" type="text" inputMode="numeric" pattern="[0-9]*" maxLength="6"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="• • • • • •"
              className="input-glass nums"
              style={{ textAlign: 'center', letterSpacing: 10, fontSize: 22, marginBottom: 16 }}
              required
            />

            <label htmlFor="new-pin" className="text-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
              PIN nou {role === 'viewer' ? '(4 cifre)' : '(8 cifre)'}
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
              Confirmă PIN-ul
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
              {loading ? 'Se actualizează…' : 'Setează PIN-ul nou'}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                marginTop: 12, background: 'transparent', border: 'none',
                color: 'var(--ink-2)', fontSize: 13, width: '100%', cursor: 'pointer',
              }}
            >
              ← Înapoi
            </button>
          </form>
        )}

        <div style={{
          textAlign: 'center', marginTop: 18,
          fontSize: 13, color: 'var(--ink-2)',
        }}>
          <Link href="/login" legacyBehavior>
            <a style={{ color: 'inherit', textDecoration: 'none', borderBottom: '1px dashed var(--glass-hairline-strong)', paddingBottom: 1 }}>
              Înapoi la login
            </a>
          </Link>
        </div>
      </div>
    </div>
  )
}
