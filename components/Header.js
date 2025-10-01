import { useState } from 'react'
import { useRouter } from 'next/router'
import { clearSession } from '../lib/pinAuth'

export default function Header({ familyName, role }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  
  const isSkillsPage = router.pathname === '/skills'

  const handleSignOut = () => {
    setLoading(true)
    clearSession()
    router.push('/login')
    setLoading(false)
  }

  return (
    <header style={{
      background: 'white',
      borderBottom: '1px solid var(--border-light)'
    }}>
      <div style={{ maxWidth: '935px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
          {/* Home Button */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
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
              title="Acasă"
            >
              🏠
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
                Album
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
                Skills
              </button>
            )}
          </nav>

          {/* Sign Out Icon */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={handleSignOut}
              disabled={loading}
              title="Deconectare"
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
    </header>
  )
}