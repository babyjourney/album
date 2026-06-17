import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { getSession, isAuthenticated, clearSession, authenticatedFetch } from '../lib/pinAuth'
import { useTier } from '../hooks/useTier'
import { useToast } from '../contexts/ToastContext'
import FeatureGate from '../components/FeatureGate'
import FloatingDock from '../components/layout/FloatingDock'
import SettingsDrawer from '../components/layout/SettingsDrawer'

const CONCIERGE = [
  { key: 'printedFamilyTreePoster', icon: '🖼️', label: 'Poster Arbore Genealogic (printat)' },
  { key: 'printedYearbook', icon: '📔', label: 'Anuar printat 20×20cm' },
  { key: 'doneForYouSetup', icon: '🪄', label: 'Configurare Done-For-You' },
  { key: 'contentUploadAssistance', icon: '⬆️', label: 'Asistență încărcare conținut' },
  { key: 'memoryOrganization', icon: '🗂️', label: 'Organizare amintiri' },
  { key: 'dataMigration', icon: '🔄', label: 'Migrare date' },
]

export default function Legacy() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [requesting, setRequesting] = useState(null)
  const { showSuccess, showError } = useToast()

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return }
    setSession(getSession())
  }, [router])

  const request = async (key) => {
    setRequesting(key)
    try {
      const res = await authenticatedFetch('/api/concierge/request', {
        method: 'POST', body: JSON.stringify({ service: key }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Eroare')
      showSuccess('Cerere trimisă — te contactăm în curând.')
    } catch (e) { showError(e.message) } finally { setRequesting(null) }
  }

  if (!session) return null

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <FloatingDock
        albumTitle={session.familyName}
        onSettings={() => setShowSettings(true)}
        onSignOut={() => { clearSession(); router.push('/login') }}
      />
      <SettingsDrawer isOpen={showSettings} onClose={() => setShowSettings(false)} onSignOut={() => { clearSession(); router.push('/login') }} />

      <div className="main-container" style={{ paddingTop: 'max(96px, calc(env(safe-area-inset-top) + 80px))', paddingBottom: 'max(120px, env(safe-area-inset-bottom))' }}>
        <div style={{ padding: '28px 0 12px' }}>
          <p className="text-eyebrow" style={{ color: '#b45309', marginBottom: 10 }}>Legacy</p>
          <h1 className="text-display" style={{ marginBottom: 6 }}>Servicii Legacy</h1>
          <p className="text-subtle" style={{ fontSize: 14, margin: 0 }}>Păstrare pe viață, export și servicii premium.</p>
        </div>

        <FeatureGate feature="pdfExport" title="Servicii Legacy — plan Legacy">
          {/* Export + imports */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 20 }}>
            <div className="card-glass" style={{ padding: 20 }}>
              <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 16 }}>📄 Export PDF / Carte</h3>
              <p className="text-subtle" style={{ fontSize: 13 }}>Exportă întreaga cronologie ca document printabil.</p>
              <button onClick={() => router.push('/export')} className="btn-iris sheen" style={{ padding: '9px 16px' }}>Deschide export</button>
            </div>
            <div className="card-glass" style={{ padding: 20 }}>
              <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 16 }}>📥 Import din alte servicii</h3>
              <p className="text-subtle" style={{ fontSize: 13 }}>Google Photos, Instagram, Dropbox și altele.</p>
              <button onClick={() => router.push('/import')} className="btn-glass" style={{ padding: '9px 16px' }}>Deschide import</button>
            </div>
            <div className="card-glass" style={{ padding: 20 }}>
              <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 16 }}>🔒 Păstrare pe viață</h3>
              <p className="text-subtle" style={{ fontSize: 13 }}>Conținutul tău este păstrat în siguranță, pe termen lung.</p>
            </div>
            <div className="card-glass" style={{ padding: 20 }}>
              <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 16 }}>✨ Acces timpuriu</h3>
              <p className="text-subtle" style={{ fontSize: 13 }}>Primești funcțiile noi înaintea tuturor.</p>
            </div>
          </div>

          {/* Concierge */}
          <div className="card-glass" style={{ padding: 20 }}>
            <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 18 }}>Servicii concierge</h3>
            <p className="text-subtle" style={{ fontSize: 13, marginTop: 0 }}>Cere un serviciu — echipa te contactează pentru detalii.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {CONCIERGE.map((s) => (
                <div key={s.key} className="glass-soft" style={{ padding: 16, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-1)' }}>
                    <span style={{ marginRight: 8 }}>{s.icon}</span>{s.label}
                  </div>
                  <button
                    onClick={() => request(s.key)}
                    disabled={requesting === s.key}
                    className="btn-glass"
                    style={{ padding: '8px 14px', fontSize: 13, alignSelf: 'flex-start' }}
                  >
                    {requesting === s.key ? 'Se trimite…' : 'Cere serviciul'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </FeatureGate>
      </div>
    </div>
  )
}
