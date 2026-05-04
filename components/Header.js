import { useState } from 'react'
import { useRouter } from 'next/router'
import { clearSession } from '../lib/pinAuth'
import { useLanguage } from '../contexts/LanguageContext'
import { useTheme } from '../contexts/ThemeContext'

export default function Header({ familyName, role, albumTitle }) {
  const [loading, setLoading] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const { language, changeLanguage, t } = useLanguage()
  const { currentTheme, changeTheme, themes } = useTheme()
  const router = useRouter()
  const isSkillsPage = router.pathname === '/skills'

  const handleConfirmSignOut = () => {
    setLoading(true)
    setShowConfirmModal(false)
    clearSession()
    router.push('/login')
    setLoading(false)
  }

  return (
    <>
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'var(--glass-2)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderBottom: '1px solid var(--glass-hairline)',
      boxShadow: 'inset 0 -1px 0 0 var(--glass-hairline)',
    }}>
      <div className="main-container">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
          gap: 12,
        }}>
          {/* Left: Home + Settings */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-icon"
              title={t('home')}
              aria-label={t('home')}
              style={{
                background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#fff',
                boxShadow:
                  'inset 0 1px 0 0 rgba(255,255,255,0.30),' +
                  ' 0 6px 18px -6px rgba(124,58,237,0.45)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12 12 3l9 9"/>
                <path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10"/>
              </svg>
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="btn-icon"
              title={t('language') + ' / ' + t('theme')}
              aria-label="Settings"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>

          {/* Center: nav */}
          <nav>
            <button
              onClick={() => router.push(isSkillsPage ? '/dashboard' : '/skills')}
              className="glass-pill sheen"
              style={{
                padding: '9px 18px',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--ink-1)',
                cursor: 'pointer',
                transition: 'transform 200ms cubic-bezier(0.22,1,0.36,1)',
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)' }}
              onMouseUp={(e)   => { e.currentTarget.style.transform = 'scale(1)' }}
              onMouseLeave={(e)=> { e.currentTarget.style.transform = 'scale(1)' }}
            >
              {isSkillsPage ? t('album') : t('skills')}
            </button>
          </nav>

          {/* Right: sign out */}
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={loading}
            className="btn-icon"
            title={t('signOut')}
            aria-label={t('signOut')}
          >
            {loading ? (
              <div style={{
                width: 16, height: 16,
                border: '2px solid var(--ink-2)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <div onClick={() => setShowSettingsModal(false)} className="modal-scrim" style={{ zIndex: 9999 }}>
          <div onClick={(e) => e.stopPropagation()} className="modal-glass" style={{ maxWidth: 440, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <h3 className="text-section-title" style={{ fontSize: 20 }}>Settings</h3>
              <button onClick={() => setShowSettingsModal(false)} className="btn-icon" aria-label="Close" style={{ width: 36, height: 36 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6"  y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Language */}
            <div style={{ marginBottom: 22 }}>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: 10 }}>
                {t('language')}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { code: 'ro', flag: '🇷🇴', name: 'Română' },
                  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
                  { code: 'en', flag: '🇺🇸', name: 'English' },
                ].map((lang) => {
                  const active = language === lang.code
                  return (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className={active ? 'category-pill category-pill--selected' : 'category-pill'}
                      style={{
                        flexDirection: 'column', gap: 4,
                        padding: '12px 8px', fontSize: 13,
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Theme */}
            <div style={{ marginBottom: 24 }}>
              <label className="text-eyebrow" style={{ display: 'block', marginBottom: 10 }}>
                {t('theme')}
              </label>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'space-around' }}>
                {Object.values(themes).map((theme) => {
                  const active = currentTheme === theme.name
                  return (
                    <button
                      key={theme.name}
                      onClick={() => changeTheme(theme.name)}
                      title={theme.label}
                      style={{
                        position: 'relative',
                        width: 56, height: 56,
                        borderRadius: '50%',
                        background: theme.swatch,
                        border: active ? '3px solid var(--accent-iris)' : '1px solid var(--glass-hairline)',
                        cursor: 'pointer',
                        transition: 'transform 220ms cubic-bezier(0.22,1,0.36,1), box-shadow 220ms',
                        boxShadow: active
                          ? '0 0 0 4px rgba(124,58,237,0.18), 0 8px 18px -6px rgba(0,0,0,0.20)'
                          : 'inset 0 1px 0 0 rgba(255,255,255,0.45), 0 4px 12px -4px rgba(0,0,0,0.12)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.06)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                    >
                      {active && (
                        <span style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 18, fontWeight: 700,
                          textShadow: '0 1px 4px rgba(0,0,0,0.4)',
                        }}>✓</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className="btn-iris sheen"
              style={{ width: '100%', padding: 12, fontSize: 14 }}
            >
              {t('done')}
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM SIGN OUT */}
      {showConfirmModal && (
        <div onClick={() => setShowConfirmModal(false)} className="modal-scrim" style={{ zIndex: 10000 }}>
          <div onClick={(e) => e.stopPropagation()} className="modal-glass" style={{ maxWidth: 420, padding: 32, textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, margin: '0 auto 18px',
              borderRadius: 20,
              background: 'linear-gradient(135deg, #fde68a, #f59e0b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px -6px rgba(245,158,11,0.45), inset 0 1px 0 0 rgba(255,255,255,0.45)',
              border: '1px solid rgba(255,255,255,0.30)',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9"  x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h3 className="text-section-title" style={{ fontSize: 20, marginBottom: 8 }}>{t('confirmSignOut')}</h3>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 24 }}>
              {t('signOutConfirmText')}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setShowConfirmModal(false)} className="btn-glass" style={{ minWidth: 120 }}>
                {t('cancel')}
              </button>
              <button
                onClick={handleConfirmSignOut}
                disabled={loading}
                className="sheen"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  minWidth: 120, padding: '12px 20px',
                  background: 'linear-gradient(135deg, #f87171, #dc2626)',
                  color: '#fff', border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: 14, fontSize: 14, fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 20px -6px rgba(220,38,38,0.50), inset 0 1px 0 0 rgba(255,255,255,0.30)',
                }}
              >
                {loading && (
                  <div style={{ width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                )}
                {t('disconnect')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
