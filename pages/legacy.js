import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { getSession, isAuthenticated, clearSession, authenticatedFetch } from '../lib/pinAuth'
import { useTier } from '../hooks/useTier'
import { useToast } from '../contexts/ToastContext'
import { useLanguage } from '../contexts/LanguageContext'
import FeatureGate from '../components/FeatureGate'
import FloatingDock from '../components/layout/FloatingDock'
import SettingsDrawer from '../components/layout/SettingsDrawer'

const CONCIERGE = [
  { key: 'printedFamilyTreePoster', icon: '🖼️', labelKey: 'conciergePoster' },
  { key: 'printedYearbook', icon: '📔', labelKey: 'conciergeYearbook' },
  { key: 'doneForYouSetup', icon: '🪄', labelKey: 'conciergeDoneForYou' },
  { key: 'contentUploadAssistance', icon: '⬆️', labelKey: 'conciergeUploadHelp' },
  { key: 'memoryOrganization', icon: '🗂️', labelKey: 'conciergeMemoryOrg' },
  { key: 'dataMigration', icon: '🔄', labelKey: 'conciergeDataMigration' },
]

export default function Legacy() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [requesting, setRequesting] = useState(null)
  const { showSuccess, showError } = useToast()
  const { t } = useLanguage()

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
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        showError((data.errorKey ? t(data.errorKey) : data.error) || t('error'))
        return
      }
      showSuccess(t('conciergeRequestSent'))
    } catch { showError(t('forgotNetworkError')) } finally { setRequesting(null) }
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
          <h1 className="text-display" style={{ marginBottom: 6 }}>{t('legacyPageTitle')}</h1>
          <p className="text-subtle" style={{ fontSize: 14, margin: 0 }}>{t('legacySubtitle')}</p>
        </div>

        <FeatureGate feature="pdfExport" title={t('legacyGateTitle')}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 20 }}>
            <div className="card-glass" style={{ padding: 20 }}>
              <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 16 }}>📄 {t('legacyExportTitle')}</h3>
              <p className="text-subtle" style={{ fontSize: 13 }}>{t('legacyExportDesc')}</p>
              <button onClick={() => router.push('/export')} className="btn-iris sheen" style={{ padding: '9px 16px' }}>{t('legacyOpenExport')}</button>
            </div>
            <div className="card-glass" style={{ padding: 20 }}>
              <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 16 }}>📥 {t('legacyImportTitle')}</h3>
              <p className="text-subtle" style={{ fontSize: 13 }}>{t('legacyImportDesc')}</p>
              <button onClick={() => router.push('/import')} className="btn-glass" style={{ padding: '9px 16px' }}>{t('legacyOpenImport')}</button>
            </div>
            <div className="card-glass" style={{ padding: 20 }}>
              <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 16 }}>🔒 {t('legacyLifetimeTitle')}</h3>
              <p className="text-subtle" style={{ fontSize: 13 }}>{t('legacyLifetimeDesc')}</p>
            </div>
            <div className="card-glass" style={{ padding: 20 }}>
              <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 16 }}>✨ {t('legacyEarlyAccessTitle')}</h3>
              <p className="text-subtle" style={{ fontSize: 13 }}>{t('legacyEarlyAccessDesc')}</p>
            </div>
          </div>

          <div className="card-glass" style={{ padding: 20 }}>
            <h3 className="text-section-title" style={{ marginTop: 0, fontSize: 18 }}>{t('conciergeTitle')}</h3>
            <p className="text-subtle" style={{ fontSize: 13, marginTop: 0 }}>{t('conciergeHint')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {CONCIERGE.map((s) => (
                <div key={s.key} className="glass-soft" style={{ padding: 16, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-1)' }}>
                    <span style={{ marginRight: 8 }}>{s.icon}</span>{t(s.labelKey)}
                  </div>
                  <button
                    onClick={() => request(s.key)}
                    disabled={requesting === s.key}
                    className="btn-glass"
                    style={{ padding: '8px 14px', fontSize: 13, alignSelf: 'flex-start' }}
                  >
                    {requesting === s.key ? t('conciergeSending') : t('conciergeRequest')}
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
