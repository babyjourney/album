import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSession, isAuthenticated, clearSession } from '../lib/pinAuth'
import { useChildren } from '../lib/useChildren'
import { useLanguage } from '../contexts/LanguageContext'
import FloatingDock from '../components/layout/FloatingDock'
import SettingsDrawer from '../components/layout/SettingsDrawer'

export default function FamilyTree() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedChildId, setSelectedChildId] = useState(null)
  const router = useRouter()
  const { t } = useLanguage()
  const { children, isMultiChild } = useChildren(session?.familyId)

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return }
    setSession(getSession())
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          border: '3px solid var(--glass-hairline)',
          borderTopColor: 'var(--accent-iris)',
          animation: 'spin 0.9s linear infinite',
        }} />
      </div>
    )
  }

  if (!session) return null

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <FloatingDock
        onSettings={() => setShowSettings(true)}
        onSignOut={() => { clearSession(); router.push('/login') }}
        children={isMultiChild ? children : []}
        selectedChildId={selectedChildId}
        onSelectChild={isMultiChild ? setSelectedChildId : undefined}
      />

      <main style={{
        position: 'relative',
        zIndex: 1,
        paddingTop: 'max(96px, calc(env(safe-area-inset-top) + 80px))',
        paddingLeft: 'max(20px, env(safe-area-inset-left))',
        paddingRight: 'max(20px, env(safe-area-inset-right))',
        paddingBottom: 'max(120px, env(safe-area-inset-bottom))',
        maxWidth: 1480,
        margin: '0 auto',
      }}>
        <header style={{ marginBottom: 32 }}>
          <p className="text-eyebrow" style={{ color: 'var(--accent-iris)', marginBottom: 10 }}>
            {t('familyTree') || 'Arbore genealogic'}
          </p>
          <h1 className="text-display" style={{ fontSize: 'clamp(36px, 6vw, 64px)', marginBottom: 8 }}>
            {t('familyTree') || 'Arbore genealogic'}
          </h1>
        </header>

        <div className="card-glass" style={{
          textAlign: 'center',
          padding: '64px 28px',
          maxWidth: 560,
          margin: '0 auto',
        }}>
          <div style={{
            width: 96, height: 96, margin: '0 auto 20px',
            borderRadius: 28,
            background: 'linear-gradient(135deg, #fb923c, #c2410c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 14px 32px -6px rgba(234,88,12,0.45), inset 0 1px 0 0 rgba(255,255,255,0.30)',
            border: '1px solid rgba(255,255,255,0.20)',
          }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="4" r="2"/>
              <circle cx="5" cy="17" r="2"/>
              <circle cx="19" cy="17" r="2"/>
              <path d="M12 6v3"/>
              <path d="M5 15v-2h14v2"/>
              <path d="M12 9v4"/>
            </svg>
          </div>
          <h2 className="text-section-title" style={{ marginBottom: 10 }}>În curând</h2>
          <p className="text-body" style={{ color: 'var(--ink-2)', lineHeight: 1.55 }}>
            Vom construi arborele genealogic al familiei aici — vei putea adăuga membri,
            relații și fotografii care să unească generațiile.
          </p>
        </div>
      </main>

      <SettingsDrawer
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSignOut={() => { clearSession(); router.push('/login') }}
      />
    </div>
  )
}
