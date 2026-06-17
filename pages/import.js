import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { getSession, isAuthenticated, clearSession, authenticatedFetch } from '../lib/pinAuth'
import { useToast } from '../contexts/ToastContext'
import FeatureGate from '../components/FeatureGate'
import FloatingDock from '../components/layout/FloatingDock'
import SettingsDrawer from '../components/layout/SettingsDrawer'
import FileImporter from '../components/import/FileImporter'

// Live OAuth providers. Each needs a registered developer app + client
// credentials (env) before it can connect — until then we offer an assisted
// migration request (a Legacy concierge service).
const PROVIDERS = [
  { id: 'google_photos', icon: '🌅', name: 'Google Photos' },
  { id: 'apple_photos', icon: '🍎', name: 'Apple Photos' },
  { id: 'facebook', icon: '📘', name: 'Facebook' },
  { id: 'instagram', icon: '📸', name: 'Instagram' },
  { id: 'dropbox', icon: '📦', name: 'Dropbox' },
  { id: 'onedrive', icon: '☁️', name: 'OneDrive' },
  { id: 'telegram', icon: '✈️', name: 'Telegram' },
]

export default function ImportPage() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [requesting, setRequesting] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const { showSuccess, showError } = useToast()

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return }
    setSession(getSession())
  }, [router])

  const requestMigration = async (provider) => {
    setRequesting(provider.id)
    try {
      const res = await authenticatedFetch('/api/concierge/request', {
        method: 'POST',
        body: JSON.stringify({ service: 'dataMigration', message: `Migrare din ${provider.name}` }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Eroare')
      showSuccess(`Cerere de migrare din ${provider.name} trimisă.`)
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
          <h1 className="text-display" style={{ marginBottom: 6 }}>Import</h1>
          <p className="text-subtle" style={{ fontSize: 14, margin: 0 }}>Adu amintirile din alte servicii în album.</p>
        </div>

        <FeatureGate feature="importExternal" title="Import — plan Legacy">
          <div style={{ marginBottom: 20 }}>
            <FileImporter familyId={session.familyId} />
          </div>

          <div className="card-glass" style={{ padding: 20 }}>
            <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 18 }}>Conectează un serviciu</h3>
            <p className="text-subtle" style={{ fontSize: 13, marginTop: 0 }}>
              Conectarea directă necesită configurarea OAuth. Până atunci, cere o migrare
              asistată și ne ocupăm noi de transfer.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {PROVIDERS.map((p) => (
                <div key={p.id} className="glass-soft" style={{ padding: 16, borderRadius: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 4 }}>
                    <span style={{ marginRight: 8 }}>{p.icon}</span>{p.name}
                  </div>
                  <div className="text-subtle" style={{ fontSize: 11, marginBottom: 10 }}>Necesită configurare OAuth</div>
                  <button
                    onClick={() => requestMigration(p)}
                    disabled={requesting === p.id}
                    className="btn-glass"
                    style={{ padding: '8px 14px', fontSize: 13 }}
                  >
                    {requesting === p.id ? 'Se trimite…' : 'Solicită migrare'}
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
