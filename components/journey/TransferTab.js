// Ownership Transfer at 18 — reassign the album to the adult child.
import { useState } from 'react'
import { authenticatedFetch, isEditor } from '../../lib/pinAuth'
import { useToast } from '../../contexts/ToastContext'

export default function TransferTab({ familyId }) {
  const [email, setEmail] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const { showError } = useToast()
  const canEdit = isEditor()

  const transfer = async () => {
    setBusy(true)
    try {
      const res = await authenticatedFetch('/api/journey/ownership-transfer', {
        method: 'POST',
        body: JSON.stringify({ newEmail: email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Eroare')
      setResult(data)
    } catch (e) { showError(e.message) } finally { setBusy(false) }
  }

  return (
    <section className="card-glass" style={{ padding: 20, maxWidth: 560 }}>
      <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 18 }}>Transfer la 18 ani</h3>
      <p className="text-subtle" style={{ fontSize: 13.5, lineHeight: 1.55 }}>
        Predă albumul copilului devenit adult. Vom seta emailul lui ca nou contact al
        contului și vom genera un PIN de editor nou, trimis pe acel email. <strong>PIN-ul
        de editor curent va fi înlocuit.</strong>
      </p>

      {result ? (
        <div className="glass-soft" style={{ padding: 16, borderRadius: 12 }}>
          <p style={{ margin: '0 0 8px' }}>✅ Transfer finalizat către <strong>{result.newEmail}</strong>.</p>
          <p style={{ margin: 0, fontSize: 13 }}>Noul PIN de editor (trimis și pe email):</p>
          <p className="nums" style={{ fontSize: 26, fontWeight: 700, letterSpacing: 4, color: 'var(--accent-iris)', margin: '6px 0 0' }}>
            {result.newEditorPin}
          </p>
        </div>
      ) : !canEdit ? (
        <div className="text-subtle">Doar editorul poate iniția transferul.</div>
      ) : (
        <>
          <label className="text-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Email nou proprietar</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="input-glass" style={{ width: '100%' }} placeholder="adult@email.com"
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0', fontSize: 13.5 }}>
            <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
            Înțeleg că PIN-ul de editor curent va fi înlocuit.
          </label>
          <button
            onClick={transfer}
            disabled={busy || !confirm || !email}
            className="btn-iris sheen"
            style={{ padding: '10px 18px', opacity: (busy || !confirm || !email) ? 0.5 : 1 }}
          >
            {busy ? 'Se transferă…' : 'Transferă albumul'}
          </button>
        </>
      )}
    </section>
  )
}
