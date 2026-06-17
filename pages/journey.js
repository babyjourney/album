import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { getSession, isAuthenticated, clearSession, authenticatedFetch } from '../lib/pinAuth'
import { useTier } from '../hooks/useTier'
import FeatureGate from '../components/FeatureGate'
import FloatingDock from '../components/layout/FloatingDock'
import SettingsDrawer from '../components/layout/SettingsDrawer'
import BiographyTab from '../components/journey/BiographyTab'
import TimelinesTab from '../components/journey/TimelinesTab'
import HealthTab from '../components/journey/HealthTab'
import GrowthTab from '../components/journey/GrowthTab'
import EducationTab from '../components/journey/EducationTab'
import ChaptersTab from '../components/journey/ChaptersTab'
import TransferTab from '../components/journey/TransferTab'

const TABS = [
  { id: 'biography', label: 'Biografie',  feature: 'biography',           Comp: BiographyTab },
  { id: 'timelines', label: 'Cronologii', feature: 'birthTimeline',       Comp: TimelinesTab },
  { id: 'health',    label: 'Sănătate',   feature: 'healthDashboard',     Comp: HealthTab },
  { id: 'growth',    label: 'Creștere',   feature: 'growthTracking',      Comp: GrowthTab },
  { id: 'education',  label: 'Educație',   feature: 'educationalProgress', Comp: EducationTab },
  { id: 'chapters',  label: 'Capitole',   feature: 'lifeChapters',        Comp: ChaptersTab },
  { id: 'transfer',  label: 'Transfer',   feature: 'ownershipTransfer',   Comp: TransferTab },
]

export default function Journey() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [children, setChildren] = useState([])
  const [childId, setChildId] = useState(null)
  const [active, setActive] = useState('biography')
  const { has } = useTier()

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return }
    setSession(getSession())
    setLoading(false)
  }, [router])

  useEffect(() => {
    const run = async () => {
      if (!session?.familyId) return
      try {
        const res = await authenticatedFetch(`/api/children/list?familyId=${session.familyId}`)
        const data = await res.json()
        const kids = (res.ok && (data.children || data.data)) || []
        setChildren(kids)
        if (kids.length && !childId) setChildId(kids[0].id)
      } catch { /* no children rows — childId stays null (family-level records) */ }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  if (loading || !session) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="text-subtle">Se încarcă…</div>
  }

  const activeTab = TABS.find((t) => t.id === active) || TABS[0]
  const ActiveComp = activeTab.Comp

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <FloatingDock
        albumTitle={session.familyName}
        onSettings={() => setShowSettings(true)}
        onSignOut={() => setShowSignOutConfirm(true)}
        children={children}
        selectedChildId={childId}
        onSelectChild={(id) => setChildId(id)}
      />
      <SettingsDrawer
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSignOut={() => { setShowSettings(false); setShowSignOutConfirm(true) }}
      />
      {showSignOutConfirm && (
        <div className="modal-scrim" style={{ zIndex: 10000 }} onClick={() => setShowSignOutConfirm(false)}>
          <div className="modal-glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380, padding: 28, textAlign: 'center' }}>
            <h3 className="text-section-title" style={{ fontSize: 18, marginBottom: 6 }}>Ieși din album?</h3>
            <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 20 }}>Va trebui să te autentifici din nou cu PIN-ul.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowSignOutConfirm(false)} className="btn-glass" style={{ flex: 1 }}>Rămân</button>
              <button onClick={() => { clearSession(); router.push('/login') }} className="sheen"
                style={{ flex: 1, padding: '12px 16px', background: 'linear-gradient(135deg, #f87171, #dc2626)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Ieși</button>
            </div>
          </div>
        </div>
      )}

      <div className="main-container" style={{ paddingTop: 'max(96px, calc(env(safe-area-inset-top) + 80px))', paddingBottom: 'max(120px, env(safe-area-inset-bottom))' }}>
        <div style={{ padding: '28px 0 12px' }}>
          <h1 className="text-display" style={{ marginBottom: 6 }}>{session.familyName} · Parcursul Vieții</h1>
          <p className="text-subtle" style={{ fontSize: 14, margin: 0 }}>Biografie, cronologii, sănătate, creștere și mai mult.</p>
        </div>

        <FeatureGate feature="biography" title="Parcursul Vieții — plan Family">
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0 20px' }}>
            {TABS.map((t) => {
              const locked = !has(t.feature)
              return (
                <button
                  key={t.id}
                  onClick={() => !locked && setActive(t.id)}
                  disabled={locked}
                  className={active === t.id ? 'glass-pill sheen' : 'glass-pill'}
                  style={{
                    padding: '9px 16px', fontSize: 14, fontWeight: 600,
                    color: active === t.id ? 'var(--accent-iris)' : 'var(--ink-1)',
                    opacity: locked ? 0.5 : 1, cursor: locked ? 'not-allowed' : 'pointer',
                    border: active === t.id ? '1px solid rgba(124,58,237,0.45)' : undefined,
                  }}
                >
                  {t.label}{locked && ' 🔒'}
                </button>
              )
            })}
          </div>

          {has(activeTab.feature)
            ? <ActiveComp familyId={session.familyId} childId={childId} />
            : <FeatureGate feature={activeTab.feature} />}
        </FeatureGate>
      </div>
    </div>
  )
}
