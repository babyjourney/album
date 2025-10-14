import { useState } from 'react'
import { useRouter } from 'next/router'
import { clearSession } from '../lib/pinAuth'
import { useLanguage } from '../contexts/LanguageContext'

export default function Header({ familyName, role }) {
  const [loading, setLoading] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const { language, changeLanguage, t } = useLanguage()
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
      background: 'white',
      borderBottom: '1px solid var(--border-light)'
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
                e.target.style.background = '#2563eb'
                e.target.style.transform = 'scale(1.05)'
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'var(--accent-blue)'
                e.target.style.transform = 'scale(1)'
              }}
              title={t('home')}
            >
              🏠
            </button>
            
            {/* Language Selector */}
            <div style={{ position: 'relative' }}>
              <select
                value={language}
                onChange={(e) => changeLanguage(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-light)',
                  background: 'white',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="ro">🇷🇴 RO</option>
                <option value="ru">🇷🇺 RU</option>
              </select>
            </div>
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
                  background: 'white',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'var(--bg-gray)'
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'white'
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
                  background: 'white',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'var(--bg-gray)'
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'white'
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
                background: 'white',
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
                  e.target.style.background = 'var(--bg-gray)'
                }
              }}
              onMouseOut={(e) => {
                if (!loading) {
                  e.target.style.background = 'white'
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

      {/* Logout Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'white',
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
                color: '#111827',
                marginBottom: '8px'
              }}>
                {t('confirmSignOut')}
              </h3>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
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
                  border: '1px solid #d1d5db',
                  background: 'white',
                  color: '#374151',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minWidth: '100px'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#f9fafb'
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'white'
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
                    e.target.style.background = '#b91c1c'
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading) {
                    e.target.style.background = '#dc2626'
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