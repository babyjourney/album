import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { getSession, isAuthenticated, clearSession } from '../lib/pinAuth'
import { useLanguage } from '../contexts/LanguageContext'
import FloatingDock from '../components/layout/FloatingDock'
import SettingsDrawer from '../components/layout/SettingsDrawer'
import FilteredPosts from '../components/journey/FilteredPosts'

export default function OnThisDay() {
  const router = useRouter()
  const { language, t } = useLanguage()
  const [session, setSession] = useState(null)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return }
    setSession(getSession())
  }, [router])

  if (!session) return null

  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const locale = language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : 'ro-RO'
  const pretty = now.toLocaleDateString(locale, { day: 'numeric', month: 'long' })

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <FloatingDock
        albumTitle={session.familyName}
        onSettings={() => setShowSettings(true)}
        onSignOut={() => { clearSession(); router.push('/login') }}
      />
      <SettingsDrawer isOpen={showSettings} onClose={() => setShowSettings(false)} onSignOut={() => { clearSession(); router.push('/login') }} />

      <div className="main-container" style={{ paddingTop: 'max(96px, calc(env(safe-area-inset-top) + 80px))', paddingBottom: 'max(120px, env(safe-area-inset-bottom))' }}>
        <div style={{ padding: '28px 0 16px' }}>
          <p className="text-eyebrow" style={{ color: 'var(--accent-iris)', marginBottom: 10 }}>{t('onThisDayEyebrow')}</p>
          <h1 className="text-display" style={{ marginBottom: 6 }}>{t('onThisDayTitle')}</h1>
          <p className="text-subtle" style={{ fontSize: 14, margin: 0 }}>{t('onThisDaySubtitle', { date: pretty })}</p>
        </div>
        <section className="card-glass" style={{ padding: 20 }}>
          <FilteredPosts
            familyId={session.familyId}
            params={{ monthDay: `${mm}-${dd}`, sort: 'oldest' }}
            emptyText={t('onThisDayEmpty', { date: pretty })}
          />
        </section>
      </div>
    </div>
  )
}
