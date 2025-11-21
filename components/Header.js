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

  const handleSignOutClick = () => {
    setShowConfirmModal(true)
  }

  const handleConfirmSignOut = () => {
    setLoading(true)
    setShowConfirmModal(false)
    clearSession()
    router.push('/login')
    setLoading(false)
  }

  const handleCancelSignOut = () => {
    setShowConfirmModal(false)
  }

  return (
    <header style={{
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-light)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(8px)',
      backgroundColor: 'var(--bg-secondary)'
    }}>
      <div style={{ maxWidth: '935px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
          {/* Home Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--accent-blue)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '18px',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#2563eb'
                e.currentTarget.style.transform = 'scale(1.05)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'var(--accent-blue)'
                e.currentTarget.style.transform = 'scale(1)'
              }}
              title={t('home')}
            >
              🏠
            </button>
            
            {/* Settings Button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.2s ease-in-out',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--bg-gray)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'var(--bg-secondary)'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
              title="Настройки / Setări"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>

          {/* Single Navigation Button */}
          <nav>
            {isSkillsPage ? (
              <button
                onClick={() => router.push('/dashboard')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'var(--bg-gray)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'var(--bg-secondary)'
                }}
              >
                {t('album')}
              </button>
            ) : (
              <button
                onClick={() => router.push('/skills')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'var(--bg-gray)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'var(--bg-secondary)'
                }}
              >
                {t('skills')}
              </button>
            )}
          </nav>

          {/* Sign Out Icon */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={handleSignOutClick}
              disabled={loading}
              title={t('signOut')}
              style={{
                padding: '10px',
                borderRadius: '50%',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '16px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease-in-out',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px'
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = 'var(--bg-gray)'
                }
              }}
              onMouseOut={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = 'var(--bg-secondary)'
                }
              }}
            >
              {loading ? (
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid var(--text-secondary)',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
              ) : (
                '↗️'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div 
          onClick={() => setShowSettingsModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            backdropFilter: 'blur(4px)',
            padding: '20px'
          }}>
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              maxHeight: 'calc(100vh - 40px)',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
              transform: 'scale(1)',
              animation: 'modalAppear 0.2s ease-out',
              margin: 'auto',
              position: 'relative'
            }}>

            {/* X Close Button */}
            <button
              onClick={() => setShowSettingsModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '32px',
                height: '32px',
                border: 'none',
                background: 'var(--bg-gray)',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                fontSize: '18px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                zIndex: 1
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'var(--accent-red)'
                e.target.style.color = 'white'
                e.target.style.transform = 'scale(1.1)'
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'var(--bg-gray)'
                e.target.style.color = 'var(--text-secondary)'
                e.target.style.transform = 'scale(1)'
              }}
              title="Close"
            >
              ×
            </button>

            {/* Language Selection */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '12px'
              }}>
                🌍 Язык / Limbă
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { code: 'ro', label: '🇷🇴 Română', name: 'Română' },
                  { code: 'ru', label: '🇷🇺 Русский', name: 'Русский' },
                  { code: 'en', label: '🇺🇸 English', name: 'English' }
                ].map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    style={{
                      flex: 1,
                      padding: '12px 8px',
                      border: language === lang.code ? '2px solid var(--accent-blue)' : '1px solid var(--border-light)',
                      background: language === lang.code ? 'var(--accent-blue-light)' : 'var(--bg-secondary)',
                      color: language === lang.code ? 'var(--accent-blue)' : 'var(--text-primary)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'center'
                    }}
                    onMouseOver={(e) => {
                      if (language !== lang.code) {
                        e.currentTarget.style.background = 'var(--bg-gray)'
                        e.currentTarget.style.borderColor = '#9ca3af'
                      }
                    }}
                    onMouseOut={(e) => {
                      if (language !== lang.code) {
                        e.currentTarget.style.background = 'var(--bg-secondary)'
                        e.currentTarget.style.borderColor = '#d1d5db'
                      }
                    }}
                  >
                    <div>{lang.label}</div>
                    <div style={{ fontSize: '11px', opacity: 0.8 }}>{lang.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Selection */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '12px'
              }}>
                🎨 Тема / Temă
              </label>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '12px', 
                justifyContent: 'center'
              }}>
                {Object.values(themes).map((theme) => (
                  <button
                    key={theme.name}
                    onClick={() => changeTheme(theme.name)}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: theme.colors['--bg-primary'],
                      border: currentTheme === theme.name ? '3px solid var(--accent-blue)' : '2px solid rgba(0, 0, 0, 0.1)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: currentTheme === theme.name ? '0 0 0 2px var(--accent-blue-light)' : 'var(--shadow-sm)',
                      position: 'relative'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'scale(1.1)'
                      e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.boxShadow = currentTheme === theme.name ? '0 0 0 2px var(--accent-blue-light)' : 'var(--shadow-sm)'
                    }}
                  >
                    {currentTheme === theme.name && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: theme.colors['--text-primary'],
                        fontSize: '16px',
                        fontWeight: 'bold'
                      }}>
                        ✓
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Close Button */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{
                  padding: '12px 32px',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'var(--bg-gray)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'var(--bg-secondary)'
                }}
              >
                Готово / Gata
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(4px)',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
            transform: 'scale(1)',
            animation: 'modalAppear 0.2s ease-out'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: 'linear-gradient(135deg, #fef3c7, #f59e0b)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '28px'
              }}>
                ⚠️
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                {t('confirmSignOut')}
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                lineHeight: '1.5'
              }}>
                {t('signOutConfirmText')}
              </p>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleCancelSignOut}
                style={{
                  padding: '12px 24px',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minWidth: '100px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'var(--bg-gray)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'var(--bg-secondary)'
                }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleConfirmSignOut}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  background: loading ? '#6b7280' : '#dc2626',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  minWidth: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = '#b91c1c'
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = '#dc2626'
                  }
                }}
              >
                {loading && (
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid white',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                )}
                {t('disconnect')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes modalAppear {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </header>
  )
}